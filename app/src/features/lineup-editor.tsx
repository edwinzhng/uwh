import { type ReactElement, useState } from "react";
import { friendlyError } from "../backend/errors";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	AudienceLabel,
	Button,
	LineupWorkspace,
	PoolBoardColumns,
	PoolBoardGroup,
	PoolBoardSection,
	PoolPlayerTray,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { eventAttendees, lineupNeedsReview } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	type LineupEdit,
	lineupPeople,
	planWithSnapshot,
	validateLineup,
	validateLineupReferees,
} from "../domain/lineup";
import { reconcileLineupAttendance } from "../domain/lineup-attendance";
import { lineupDisplayNames } from "../domain/lineup-display-name";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
	acknowledgeLineupAutosave,
	currentLineupSnapshot,
	initialLineupDraft,
	lineupDraftChanged,
	stageLineupEdit,
} from "./lineup-editor-state";

import { TeamOptions } from "./team-options";
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
	const [generating, setGenerating] = useState(false);
	const [generatedRevision, setGeneratedRevision] = useState<number>();
	const [draft, setDraft] = useLineupDraft(
		JSON.stringify([
			source,
			workspaceId,
			account.id,
			plan.eventId,
			plan.partId,
		]),
		plan,
		generatedRevision ?? resetRevision,
	);
	const snapshot = currentLineupSnapshot(draft);
	const base = draft.base;
	const changed = lineupDraftChanged(draft);
	const conflicted = (plan.revision ?? 0) > (base.revision ?? 0);
	const stale = lineupNeedsReview(data, plan);
	const busy = appBusy || task.busy;
	const disabled =
		busy || conflicted || Boolean(plan.coachingStale) || (stale && changed);
	const preview = planWithSnapshot(base, snapshot);
	const [activeGroup, setActiveGroup] = useState<string>();
	const [selectedPlayer, setSelectedPlayer] = useState<string>();
	const [discarding, setDiscarding] = useState(false);
	const [publishRevision, setPublishRevision] = useState<number>();
	const attendees = eventAttendees(data, plan.eventId, plan.partId).map(
		(member) => member.id,
	);
	const unassigned = attendees.filter(
		(id) => !lineupPeople(snapshot).includes(id),
	);
	const reviewAttendance = async (): Promise<TeamPlan | undefined> => {
		const next = reconcileLineupAttendance(base, attendees, base.revision ?? 0);
		if (
			!(await dispatch({
				type: "review-lineup-attendance",
				eventId: base.eventId,
				partId: base.partId,
				expectedRevision: base.revision ?? 0,
				expectedAttendees: attendees,
			}))
		)
			return undefined;
		return next;
	};
	const stage = async (edit: LineupEdit): Promise<boolean> => {
		if (disabled) return false;
		task.clear();
		try {
			const reviewed = stale ? await reviewAttendance() : undefined;
			if (stale && !reviewed) return false;
			if (reviewed) {
				const next = stageLineupEdit(initialLineupDraft(reviewed), edit);
				setDraft(() => next);
			} else setDraft((current) => stageLineupEdit(current, edit));
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
						? "Attendance changed. Review the latest players before saving."
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
		enabled: changed && !disabled && !stale && !task.error && !editError,
		save,
	});

	const groups = base.separateYouth
		? (["adult", "youth"] as const).filter((group) =>
				base.assignments?.some((entry) => entry.ageGroup === group),
			)
		: ["combined" as const];
	const visibleGroup =
		groups.find((group) => group === activeGroup) ?? groups.at(0);
	const names = lineupDisplayNames(
		attendees.map((id) => ({
			id,
			name: data.members.find((person) => person.id === id)?.name ?? "Player",
		})),
	);
	const trayPlayers = attendees.flatMap((id) => {
		const member = data.members.find((person) => person.id === id);
		if (!member) return [];
		const age =
			data.playerCoaching?.find((entry) => entry.personId === id)?.ageGroup ??
			(member.programs.includes("youth") ? "youth" : "adult");
		return visibleGroup !== "combined" && visibleGroup !== age
			? []
			: [
					{
						id,
						name: member.name,
						displayName: names.get(id),
						assigned: !unassigned.includes(id),
					},
				];
	});
	return (
		<PoolBoardGroup backdrop={false}>
			<LineupWorkspace
				footer={
					<PoolPlayerTray
						players={trayPlayers}
						scope={visibleGroup ?? "combined"}
						selectedPersonId={selectedPlayer}
						onSelect={(id): void =>
							setSelectedPlayer((current) => (current === id ? undefined : id))
						}
						disabled={disabled}
					/>
				}
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
						<Row gap="xs" wrap>
							<Button
								label="Regenerate"
								accessibilityLabel="Regenerate teams"
								variant="secondary"
								compact
								isDisabled={busy || changed || conflicted}
								onPress={(): void => setGenerating(true)}
							/>
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
							{base.published && !base.draftLineup && !changed ? (
								<AudienceLabel audience="players" />
							) : (
								<AudienceLabel
									audience="coaches"
									label={
										base.published
											? "Changes: coaches only"
											: "Draft: coaches only"
									}
								/>
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
									stale ||
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
					<Stack gap="xs">
						<Text variant="small" tone="warning">
							{stale && changed
								? "Attendance changed while you were editing. Your unsaved changes are kept; reload the lineup to review the latest attendance."
								: plan.coachingStale
									? "Player details changed. Regenerate teams."
									: "Attendance changed. Select a position to add players, or review attendance to keep the current teams."}
						</Text>
						{changed ? (
							<Button
								label="Reload latest"
								variant="secondary"
								compact
								onPress={(): void => setDiscarding(true)}
							/>
						) : undefined}
						{!plan.coachingStale ? (
							<Button
								label="Review attendance"
								variant="secondary"
								compact
								isDisabled={busy || changed}
								onPress={(): void => {
									void reviewAttendance()
										.then((next): void => {
											if (next) setDraft(() => initialLineupDraft(next));
										})
										.catch((error: unknown): void =>
											setEditError(friendlyError(error)),
										);
								}}
							/>
						) : undefined}
					</Stack>
				) : undefined}
				{!stale && unassigned.length ? (
					<Text variant="small" tone="secondary">
						{unassigned.length} attending{" "}
						{unassigned.length === 1 ? "player is" : "players are"} not in the
						lineup. Select a position to add them.
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
								<PoolBoardColumns>
									{(["black", "white"] as const).map((team) => (
										<TeamPool
											key={team}
											plan={preview}
											side={team}
											group={group}
											selectedPersonId={selectedPlayer}
											onViceCaptainChange={
												disabled
													? undefined
													: (personId): void => {
															void stage({
																kind: "captain",
																role: "vice",
																side: team,
																personId,
																group,
															});
														}
											}
											onSecondRefereeChange={
												disabled
													? undefined
													: (personId): void => {
															void stage({
																kind: "referee",
																role: "second",
																side: team,
																personId,
															});
														}
											}
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
															}).then((saved): void => {
																if (saved) setSelectedPlayer(undefined);
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
							</PoolBoardSection>
						))}
				</Stack>
				{generating ? (
					<TeamOptions
						eventId={base.eventId}
						partId={base.partId}
						plan={base}
						onGenerated={setGeneratedRevision}
						onClose={(): void => setGenerating(false)}
					/>
				) : undefined}
				{publishRevision !== undefined ? (
					<ConfirmationDialog
						title="Publish teams?"
						description={
							unassigned.length
								? `Share this saved lineup with players and parents. ${unassigned.length} attending ${unassigned.length === 1 ? "player is" : "players are"} not in the lineup.`
								: "Share this saved lineup with players and parents."
						}
						confirmLabel="Publish teams"
						isDisabled={busy}
						validationError={
							changed || conflicted || publishRevision !== (base.revision ?? 0)
								? "Lineup changed. Review it before publishing."
								: stale
									? "Review the latest attendance before publishing."
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
		</PoolBoardGroup>
	);
};
