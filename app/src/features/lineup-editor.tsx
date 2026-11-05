import { type ReactElement, useState } from "react";
import { friendlyError } from "../backend/errors";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	LineupWorkspace,
	PoolBoardColumns,
	PoolBoardGroup,
	PoolBoardSection,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { lineupNeedsReview } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	formationPositions,
	type LineupEdit,
	type LineupSide,
	lineupLocation,
	lineupPeople,
	planWithSnapshot,
	validateLineup,
	validateLineupReferees,
} from "../domain/lineup";
import { formatTeams, type Position } from "../domain/player-coaching";
import * as Clipboard from "../platform/clipboard";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
	commitLineupDraft,
	currentLineupSnapshot,
	initialLineupDraft,
	lineupDraftChanged,
	stageLineupEdit,
	undoLineupEdit,
} from "./lineup-editor-state";
import { LineupPlayerTools } from "./lineup-player-tools";
import {
	LineupPositionPicker,
	type LineupPositionTarget,
} from "./lineup-position-picker";
import { TeamPool } from "./team-pool";
import { useFormTask } from "./use-form-task";
import { useLineupDraft } from "./use-lineup-draft";

export const LineupEditor = ({
	plan,
	onRegenerate,
	canRegenerate,
	resetRevision,
}: {
	plan: TeamPlan;
	onRegenerate: () => void;
	canRegenerate: boolean;
	resetRevision?: number;
}): ReactElement => {
	const { data, account, workspaceId, source, dispatch } = useApp();
	const { busy: appBusy } = useAppStatus();
	const task = useFormTask();
	const [editError, setEditError] = useState<string>();
	const [draft, setDraft] = useLineupDraft(
		JSON.stringify([
			source,
			workspaceId,
			account.id,
			plan.eventId,
			plan.partId,
		]),
		plan,
		resetRevision,
	);
	const snapshot = currentLineupSnapshot(draft);
	const base = draft.base;
	const changed = lineupDraftChanged(draft);
	const conflicted = (plan.revision ?? 0) > (base.revision ?? 0);
	const stale = lineupNeedsReview(data, plan);
	const busy = appBusy || task.busy;
	const disabled = busy || conflicted || stale;
	const preview = planWithSnapshot(base, snapshot);
	const people = lineupPeople(snapshot);
	const [activeGroup, setActiveGroup] = useState<string>();
	const [toolsOpen, setToolsOpen] = useState(false);
	const [personId, setPersonId] = useState<string>();
	const [side, setSide] = useState<LineupSide>("black");
	const [role, setRole] = useState<Position>("FORWARD");
	const [swapId, setSwapId] = useState<string>();
	const [rotation, setRotation] = useState<LineupPositionTarget>();
	const [confirmSave, setConfirmSave] = useState(false);
	const [discarding, setDiscarding] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [publishRevision, setPublishRevision] = useState<number>();
	const [copyState, setCopyState] = useState<"ready" | "copied" | "failed">(
		"ready",
	);
	const stage = async (edit: LineupEdit): Promise<boolean> => {
		if (disabled) return false;
		task.clear();
		try {
			setDraft((current) => stageLineupEdit(current, edit));
			setCopyState("ready");
			setEditError(undefined);
			return true;
		} catch (error) {
			setEditError(friendlyError(error));
			return false;
		}
	};
	const choosePlayer = (id: string | undefined): void => {
		setEditError(undefined);
		setPersonId(id);
		setSwapId(undefined);
		const location = id ? lineupLocation(snapshot, id) : undefined;
		if (location) {
			setSide(
				location === "black" || location === "blackBench" ? "black" : "white",
			);
			setRole(
				snapshot.positions.find((entry) => entry.personId === id)?.position ??
					"FORWARD",
			);
		}
		task.clear();
	};
	const move = async (): Promise<void> => {
		if (!personId) {
			await task.submit(
				(): string => "Choose a player",
				async (): Promise<void> => {},
			);
			return;
		}
		const formation =
			side === "black" ? snapshot.blackFormation : snapshot.whiteFormation;
		const positions: readonly Position[] = formationPositions[formation];
		const slot = positions.indexOf(role);
		if (slot < 0) {
			setEditError("Choose a position in this formation.");
			return;
		}
		await stage({ kind: "add", personId, side, slot });
	};
	const swap = async (): Promise<void> => {
		if (!personId || !swapId) {
			await task.submit(
				(): string => "Choose two players",
				async (): Promise<void> => {},
			);
			return;
		}
		await stage({ kind: "swap", personId, otherId: swapId });
	};
	const save = async (): Promise<boolean> => {
		const saved = await task.submit(
			(): string | undefined =>
				conflicted
					? "Lineup changed. Reload before saving."
					: stale
						? "Regenerate teams before saving."
						: (validateLineup(base, snapshot) ??
							validateLineupReferees(snapshot, data.members)),
			async (): Promise<void> => {
				if (
					!(await dispatch({
						type: "save-lineup",
						eventId: base.eventId,
						partId: base.partId,
						expectedRevision: base.revision ?? 0,
						snapshot,
					}))
				)
					throw new Error("Couldn’t save. Your draft is kept.");
			},
		);
		if (saved) setDraft(() => commitLineupDraft(draft));
		return saved;
	};
	const copy = async (): Promise<void> => {
		try {
			await Clipboard.setStringAsync(formatTeams(preview, data.members));
			setCopyState("copied");
		} catch {
			setCopyState("failed");
		}
	};
	const groups = base.separateYouth
		? (["adult", "youth"] as const).filter((group) =>
				base.assignments?.some((entry) => entry.ageGroup === group),
			)
		: ["combined" as const];
	const visibleGroup =
		groups.find((group) => group === activeGroup) ?? groups.at(0);
	return (
		<LineupWorkspace
			controls={
				<Row justify="between" gap="xs" wrap>
					{groups.length > 1 ? (
						<Select
							compact
							hideLabel
							label="Lineup group"
							value={visibleGroup}
							options={groups.map((group) => ({
								value: group,
								label:
									group === "adult"
										? "Adults"
										: group === "youth"
											? "Youth"
											: "Teams",
							}))}
							onValueChange={(group): void => {
								if (group) setActiveGroup(group);
							}}
						/>
					) : undefined}
					<Row gap="xs">
						<ActionMenu
							label="Lineup options"
							icon="more"
							isDisabled={busy}
							groups={[
								{
									id: "edit",
									items: [
										{
											id: "copy",
											label: "Copy teams",
											icon: "copy",
											isDisabled: stale || conflicted,
											onSelect: (): void => {
												void copy();
											},
										},
										{
											id: "regenerate",
											label: "Regenerate teams",
											icon: "users",
											isDisabled: !canRegenerate,
											onSelect: (): void => {
												if (changed) setRegenerating(true);
												else onRegenerate();
											},
										},
										{
											id: "tools",
											label: toolsOpen
												? "Hide player options"
												: "Players & referees",
											icon: "settings",
											onSelect: (): void => setToolsOpen((current) => !current),
										},
										{
											id: "undo",
											label: "Undo lineup change",
											icon: "reply",
											isDisabled: disabled || draft.history.length < 2,
											onSelect: (): void => {
												setDraft(undoLineupEdit);
												setEditError(undefined);
												task.clear();
												setCopyState("ready");
											},
										},
										{
											id: "reload",
											label: changed
												? "Discard changes"
												: "Reload saved lineup",
											icon: "arrowDown",
											onSelect: (): void => setDiscarding(true),
										},
									],
								},
							]}
						/>
						<Button
							label="Save"
							compact
							variant="secondary"
							accessibilityLabel="Save lineup changes"
							isLoading={task.busy}
							isDisabled={disabled || !changed}
							onPress={(): void => {
								if (base.published) setConfirmSave(true);
								else void save();
							}}
						/>
						<Button
							label={base.published && !changed ? "Published" : "Publish"}
							compact
							isDisabled={disabled || changed || Boolean(base.published)}
							accessibilityLabel={
								changed ? "Save changes before publishing" : "Publish lineup"
							}
							onPress={(): void => setPublishRevision(base.revision ?? 0)}
						/>
					</Row>
				</Row>
			}
		>
			{copyState !== "ready" ? (
				<Text
					variant="caption"
					tone={copyState === "failed" ? "danger" : "secondary"}
				>
					{copyState === "copied"
						? "Teams copied"
						: "Couldn’t copy teams. Try again."}
				</Text>
			) : undefined}
			{conflicted ? (
				<Text variant="small" tone="warning">
					Saved lineup changed. Your edits are kept; reload to use the latest.
				</Text>
			) : stale ? (
				<Text variant="small" tone="warning">
					Attendance or player details changed. Regenerate teams.
				</Text>
			) : undefined}
			{toolsOpen ? (
				<LineupPlayerTools
					plan={base}
					snapshot={snapshot}
					people={people}
					controls={{
						personId,
						choosePlayer,
						side,
						setSide,
						role,
						setRole,
						swapId,
						setSwapId,
						move,
						swap,
					}}
					disabled={disabled}
					busy={busy}
					onClose={(): void => setToolsOpen(false)}
					stage={stage}
				/>
			) : undefined}
			{task.error || editError ? (
				<Text variant="small" tone="danger">
					{task.error ?? editError}
				</Text>
			) : undefined}
			<Stack grow>
				{groups
					.filter((group) => group === visibleGroup)
					.map((group) => (
						<PoolBoardSection key={group}>
							<PoolBoardGroup>
								<PoolBoardColumns>
									{(["black", "white"] as const).map((team) => (
										<TeamPool
											key={team}
											plan={preview}
											side={team}
											group={group}
											onRefereeChange={
												disabled
													? undefined
													: (personId): void => {
															void stage({
																kind: "referee",
																side: team,
																personId,
															});
														}
											}
											onCaptainChange={
												disabled
													? undefined
													: (personId): void => {
															void stage({
																kind: "captain",
																side: team,
																personId,
																group,
															});
														}
											}
											onFormationChange={
												disabled
													? undefined
													: (formation): void => {
															void stage({
																kind: "formation",
																side: team,
																formation,
															});
														}
											}
											selectedPersonId={personId}
											onManageRotation={
												disabled
													? undefined
													: (slot, label): void => {
															task.clear();
															setRotation({ side: team, slot, label, group });
														}
											}
											onAdd={
												disabled
													? undefined
													: (id, slot): void => {
															void stage({
																kind: "add",
																personId: id,
																side: team,
																slot,
																ageGroup:
																	group === "combined" ? undefined : group,
															});
														}
											}
											onSwap={
												disabled
													? undefined
													: (id, otherId): void => {
															void stage({
																kind: "swap",
																personId: id,
																otherId,
															});
														}
											}
											onPlace={
												disabled
													? undefined
													: (id, slot): void => {
															void stage({
																kind: "place",
																side: team,
																personId: id,
																slot,
															});
														}
											}
										/>
									))}
								</PoolBoardColumns>
							</PoolBoardGroup>
						</PoolBoardSection>
					))}
			</Stack>
			{rotation ? (
				<LineupPositionPicker
					plan={preview}
					target={rotation}
					busy={busy}
					isDisabled={conflicted || stale}
					error={
						task.error ??
						editError ??
						(conflicted
							? "Saved lineup changed. Reload it to continue."
							: stale
								? "Regenerate teams to continue."
								: undefined)
					}
					onClose={(): void => setRotation(undefined)}
					onAdd={async (id, slot, ageGroup): Promise<boolean> =>
						stage({
							kind: "add",
							personId: id,
							side: rotation.side,
							slot,
							ageGroup,
						})
					}
				/>
			) : undefined}
			{confirmSave ? (
				<ConfirmationDialog
					title="Save an unpublished lineup?"
					description="The current lineup will be hidden from players until you publish it again."
					confirmLabel="Save changes"
					isDisabled={disabled}
					onClose={(): void => setConfirmSave(false)}
					onConfirm={save}
				/>
			) : undefined}
			{publishRevision !== undefined ? (
				<ConfirmationDialog
					title="Publish teams?"
					description="Share this saved lineup with players and parents."
					confirmLabel="Publish teams"
					isDisabled={busy}
					validationError={
						changed || conflicted || publishRevision !== (base.revision ?? 0)
							? "Lineup changed. Review it before publishing."
							: stale
								? "Regenerate teams before publishing."
								: undefined
					}
					onClose={(): void => setPublishRevision(undefined)}
					onConfirm={async (): Promise<boolean> => {
						if (
							changed ||
							conflicted ||
							stale ||
							publishRevision !== (base.revision ?? 0)
						)
							throw new Error("Lineup changed. Review it before publishing.");
						return dispatch({
							type: "publish-teams",
							expectedRevision: publishRevision,
							eventId: base.eventId,
							partId: base.partId,
						});
					}}
				/>
			) : undefined}
			{discarding ? (
				<ConfirmationDialog
					title={changed ? "Discard lineup changes?" : "Reload saved lineup?"}
					description={
						changed
							? "Your unsaved edits will be removed. The saved lineup stays unchanged."
							: "Use the latest saved lineup."
					}
					confirmLabel={changed ? "Discard changes" : "Reload lineup"}
					danger={changed}
					isDisabled={busy}
					onClose={(): void => setDiscarding(false)}
					onConfirm={async (): Promise<void> => {
						setDraft(() => initialLineupDraft(plan));
						setCopyState("ready");
						choosePlayer(undefined);
					}}
				/>
			) : undefined}
			{regenerating ? (
				<ConfirmationDialog
					title="Regenerate teams?"
					description="New teams will replace your unsaved edits only after generation succeeds."
					confirmLabel="Continue"
					isDisabled={busy}
					onClose={(): void => setRegenerating(false)}
					onConfirm={async (): Promise<void> => onRegenerate()}
				/>
			) : undefined}
		</LineupWorkspace>
	);
};
