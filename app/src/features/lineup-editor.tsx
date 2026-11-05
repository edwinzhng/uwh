import { type ReactElement, useState } from "react";
import { friendlyError } from "../backend/errors";
import { useApp, useAppStatus } from "../demo/app-state";
import {
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
	type LineupEdit,
	planWithSnapshot,
	validateLineup,
	validateLineupReferees,
} from "../domain/lineup";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
	acknowledgeLineupAutosave,
	currentLineupSnapshot,
	initialLineupDraft,
	lineupDraftChanged,
	stageLineupEdit,
} from "./lineup-editor-state";

import { TeamPool } from "./team-pool";
import { useFormTask } from "./use-form-task";
import { useLineupAutosave } from "./use-lineup-autosave";
import { useLineupDraft } from "./use-lineup-draft";

export const LineupEditor = ({
	plan,
	resetRevision,
}: {
	plan: TeamPlan;
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
	const [activeGroup, setActiveGroup] = useState<string>();
	const [discarding, setDiscarding] = useState(false);
	const [publishRevision, setPublishRevision] = useState<number>();
	const stage = async (edit: LineupEdit): Promise<boolean> => {
		if (disabled) return false;
		task.clear();
		try {
			setDraft((current) => stageLineupEdit(current, edit));
			setEditError(undefined);
			return true;
		} catch (error) {
			setEditError(friendlyError(error));
			return false;
		}
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
						privateDraft: true,
						eventId: base.eventId,
						partId: base.partId,
						expectedRevision: base.revision ?? 0,
						snapshot,
					}))
				)
					throw new Error("Couldn’t save. Your draft is kept.");
			},
		);
		if (saved) setDraft((current) => acknowledgeLineupAutosave(current, draft));
		return saved;
	};
	useLineupAutosave({
		snapshot,
		enabled: changed && !disabled && !task.error && !editError,
		save,
	});

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
					) : (
						<Text>Teams</Text>
					)}
					<Row gap="xs">
						{task.error && changed ? (
							<Button
								compact
								variant="ghost"
								label="Retry save"
								onPress={(): void => {
									task.clear();
									void save();
								}}
							/>
						) : (
							<Text variant="caption" tone="secondary">
								{changed || task.busy ? "Saving…" : "Saved"}
							</Text>
						)}
						<Button
							label={
								base.published
									? base.draftLineup || changed
										? "Publish changes"
										: "Published"
									: "Publish"
							}
							compact
							isDisabled={
								disabled ||
								changed ||
								Boolean(task.error) ||
								(base.published && !base.draftLineup)
							}
							accessibilityLabel={
								changed ? "Saving before publishing" : "Publish lineup"
							}
							onPress={(): void => setPublishRevision(base.revision ?? 0)}
						/>
					</Row>
				</Row>
			}
		>
			{conflicted ? (
				<Stack gap="xs">
					<Text variant="small" tone="warning">
						Saved lineup changed. Your edits are kept.
					</Text>
					<Button
						label="Reload latest"
						variant="secondary"
						compact
						onPress={(): void => setDiscarding(true)}
					/>
				</Stack>
			) : stale ? (
				<Text variant="small" tone="warning">
					Attendance or player details changed. Regenerate teams.
				</Text>
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
							<PoolBoardGroup backdrop={false}>
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
					}}
				/>
			) : undefined}
		</LineupWorkspace>
	);
};
