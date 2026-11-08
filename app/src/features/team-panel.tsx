import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	ActionMenu,
	Badge,
	Button,
	EmptyState,
	LineupDialog,
	PoolBoardColumns,
	PoolBoardGroup,
	PoolBoardSection,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	canCoach,
	eventAttendees,
	lineupNeedsReview,
} from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import {
	canCreateEventLineup,
	practiceLineupPart,
} from "../domain/event-lineups";
import {
	lineupVisibleGroups,
	lineupVisibleSides,
} from "../domain/lineup-visible-sides";
import { formatTeams } from "../domain/player-coaching";
import * as Clipboard from "../platform/clipboard";
import { LineupEditor } from "./lineup-editor";
import { TeamLineupPreview } from "./team-lineup-preview";
import { TeamOptions } from "./team-options";
import { TeamPool } from "./team-pool";
import { useReviewFlow } from "./use-review-flow";

const TeamPanelContent = ({
	event,
	partId,
	readOnly = false,
	showHeading = true,
	inline = false,
	playerPersonId,
}: {
	event: ClubEvent;
	partId?: string;
	readOnly?: boolean;
	showHeading?: boolean;
	inline?: boolean;
	playerPersonId?: string;
}): ReactElement | undefined => {
	const { data, account } = useApp();
	const { busy } = useAppStatus();
	const reviewFlow = useReviewFlow();
	const [options, setOptions] = useState(reviewFlow === "teams");
	const [generated, setGenerated] = useState<{
		eventId: string;
		partId?: string;
		revision: number;
	}>();
	const [copyState, setCopyState] = useState<"ready" | "copied" | "failed">(
		"ready",
	);
	const canGenerate =
		!readOnly &&
		canCoach(account, event.program) &&
		canCreateEventLineup(event, partId);
	const editable =
		!readOnly && canCoach(account, event.program) && !event.cancelled;
	const plan = data.teams.find(
		(entry) =>
			entry.eventId === event.id &&
			entry.partId === partId &&
			(!readOnly || entry.published),
	);
	const visibleSides = plan ? lineupVisibleSides(plan, playerPersonId) : [];
	const stale =
		plan && canCoach(account) ? lineupNeedsReview(data, plan) : false;
	const groups = plan ? lineupVisibleGroups(plan, data, playerPersonId) : [];
	const copy = async (): Promise<void> => {
		if (!plan) return;
		try {
			await Clipboard.setStringAsync(formatTeams(plan, data.members));
			setCopyState("copied");
		} catch {
			setCopyState("failed");
		}
	};
	const generationDialog =
		options && canGenerate ? (
			<TeamOptions
				key={JSON.stringify([event.id, partId])}
				eventId={event.id}
				partId={partId}
				plan={plan}
				onGenerated={(revision): void =>
					setGenerated({ eventId: event.id, partId, revision })
				}
				onClose={(): void => {
					setOptions(false);
					setCopyState("ready");
				}}
			/>
		) : undefined;
	if (!plan && !canGenerate)
		return (
			<Stack gap="heading">
				<SectionHeading>Teams</SectionHeading>
				<Surface>
					<EmptyState title="Teams not published" />
				</Surface>
			</Stack>
		);
	if (!plan && editable)
		return (
			<>
				<SectionHeading
					action={
						<Button
							label="Generate teams"
							variant="secondary"
							onPress={(): void => setOptions(true)}
						/>
					}
				>
					Teams
				</SectionHeading>
				<Surface>
					<EmptyState title="Teams not published" />
				</Surface>
				{generationDialog}
			</>
		);

	const content = (
		<Stack gap="heading" grow={editable && Boolean(plan)}>
			{editable && plan ? (
				<LineupEditor
					key={JSON.stringify([event.id, partId])}
					plan={plan}
					resetRevision={
						generated?.eventId === event.id && generated.partId === partId
							? generated.revision
							: undefined
					}
				/>
			) : (
				<>
					{showHeading ? (
						<SectionHeading
							action={
								!readOnly && canCoach(account) ? (
									<Row wrap>
										{editable ? (
											<Button
												label="Generate teams"
												prefix="users"
												variant="secondary"
												isDisabled={
													busy ||
													eventAttendees(data, event.id, partId).length < 2
												}
												onPress={(): void => setOptions(true)}
											/>
										) : undefined}
									</Row>
								) : undefined
							}
						>
							{inline && readOnly ? "Lineup" : "Teams"}
						</SectionHeading>
					) : undefined}
					{plan ? (
						<>
							{!inline || !readOnly ? (
								<Row justify="between" wrap>
									<Badge
										label={plan.published ? "Published" : "Draft"}
										kind={plan.published ? "success" : "neutral"}
									/>
									<Button
										label={
											copyState === "copied"
												? "Copied"
												: copyState === "failed"
													? "Retry copy"
													: "Copy teams"
										}
										prefix="copy"
										variant="secondary"
										isDisabled={stale}
										onPress={(): void => {
											void copy();
										}}
									/>
								</Row>
							) : undefined}
							{playerPersonId && visibleSides.length === 0 ? (
								<Text variant="small" tone="secondary">
									You are not assigned to a team for this practice.
								</Text>
							) : undefined}
							<Stack>
								{groups.map((group) => (
									<PoolBoardSection
										key={group}
										label={
											group === "combined"
												? undefined
												: group === "adult"
													? "Adults"
													: "Youth"
										}
									>
										<PoolBoardGroup>
											<PoolBoardColumns>
												{visibleSides.map((side) => (
													<TeamPool
														key={side}
														plan={plan}
														side={side}
														group={group}
													/>
												))}
											</PoolBoardColumns>
										</PoolBoardGroup>
									</PoolBoardSection>
								))}
							</Stack>
						</>
					) : (
						<Surface>
							<EmptyState
								title={editable ? "No teams" : "Teams not published"}
								description={
									editable
										? "Generate teams once at least two players are attending."
										: undefined
								}
							/>
						</Surface>
					)}
				</>
			)}
		</Stack>
	);
	return inline && readOnly ? (
		content
	) : (
		<>
			{generationDialog}
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
			<LineupDialog
				actions={
					editable && plan ? (
						<ActionMenu
							label="Team options"
							icon="more"
							isDisabled={busy}
							groups={[
								{
									id: "teams",
									items: [
										{
											id: "copy",
											label: "Copy teams",
											icon: "copy",
											isDisabled: stale,
											onSelect: (): void => {
												void copy();
											},
										},
										{
											id: "regenerate",
											label: "Regenerate teams",
											icon: "users",
											isDisabled:
												!canGenerate ||
												eventAttendees(data, event.id, partId).length < 2,
											onSelect: (): void => setOptions(true),
										},
									],
								},
							]}
						/>
					) : undefined
				}
				immersive={editable && Boolean(plan)}
				preview={
					plan?.published ? (
						<TeamLineupPreview plan={plan} playerPersonId={playerPersonId} />
					) : (
						<Surface>
							<EmptyState title="Teams not published" />
						</Surface>
					)
				}
				openRequest={generated?.revision}
				label={plan ? "Edit" : editable ? "Generate teams" : "View team status"}
			>
				{content}
			</LineupDialog>
		</>
	);
};

export const TeamPanel = ({
	event,
	partId,
	readOnly = false,
	showHeading = true,
	inline = false,
	playerPersonId,
}: {
	event: ClubEvent;
	partId?: string;
	readOnly?: boolean;
	showHeading?: boolean;
	inline?: boolean;
	playerPersonId?: string;
}): ReactElement => {
	const { data } = useApp();
	const selectedPart =
		partId ?? practiceLineupPart(event, data.teams, readOnly);
	return (
		<Stack gap="sm">
			<TeamPanelContent
				key={JSON.stringify([event.id, selectedPart])}
				event={event}
				partId={selectedPart}
				readOnly={readOnly}
				showHeading={showHeading}
				inline={inline}
				playerPersonId={playerPersonId}
			/>
		</Stack>
	);
};
