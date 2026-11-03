import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	Badge,
	Button,
	EmptyState,
	LineupDialog,
	PoolBoardColumns,
	PoolBoardGroup,
	PoolBoardSection,
	Row,
	SectionHeading,
	SegmentedControl,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	canCoach,
	eventAttendees,
	lineupNeedsReview,
	memberName,
} from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { type AgeGroup, formatTeams } from "../domain/player-coaching";
import * as Clipboard from "../platform/clipboard";
import { EventCoaches } from "./event-coaches";
import { LineupEditor } from "./lineup-editor";
import { TeamOptions } from "./team-options";
import { TeamPool } from "./team-pool";
import { TeamSide } from "./team-side";
import { useReviewFlow } from "./use-review-flow";

export const TeamPanel = ({
	event,
	partId,
	readOnly = false,
	showHeading = true,
}: {
	event: ClubEvent;
	partId?: string;
	readOnly?: boolean;
	showHeading?: boolean;
}): ReactElement => {
	const { data, account } = useApp();
	const { busy } = useAppStatus();
	const reviewFlow = useReviewFlow();
	const [options, setOptions] = useState(reviewFlow === "teams");
	const [view, setView] = useState<"pool" | "list">("pool");
	const [generated, setGenerated] = useState<{
		eventId: string;
		partId?: string;
		revision: number;
	}>();
	const [copyState, setCopyState] = useState<"ready" | "copied" | "failed">(
		"ready",
	);
	const editable =
		!readOnly && canCoach(account, event.program) && !event.cancelled;
	const plan = data.teams.find(
		(entry) =>
			entry.eventId === event.id &&
			entry.partId === partId &&
			(!readOnly || entry.published),
	);
	const stale =
		plan && canCoach(account) ? lineupNeedsReview(data, plan) : false;
	const groups: (AgeGroup | "combined")[] = plan?.separateYouth
		? ["adult", "youth"]
		: ["combined"];
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
		options && editable ? (
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
				{generationDialog}
			</>
		);

	return (
		<LineupDialog
			openRequest={generated?.revision}
			label={
				plan ? "Open lineup" : editable ? "Generate teams" : "View team status"
			}
		>
			<Stack gap="sm">
				{editable && plan ? (
					<LineupEditor
						key={JSON.stringify([event.id, partId])}
						plan={plan}
						onRegenerate={(): void => setOptions(true)}
						canRegenerate={eventAttendees(data, event.id, partId).length >= 2}
						overlayOpen={options}
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
											<EventCoaches
												event={event}
												partId={partId}
												presentation="button"
											/>
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
								Teams
							</SectionHeading>
						) : undefined}
						{plan ? (
							<>
								<Row justify="between">
									<Text variant="label">Lineup view</Text>
									<SegmentedControl
										label="Lineup view"
										hideLabel
										value={view}
										onValueChange={setView}
										options={[
											{ value: "pool", label: "Pool" },
											{ value: "list", label: "List" },
										]}
									/>
								</Row>
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
								<PoolBoardGroup active={!options}>
									{groups
										.filter(
											(group) =>
												group === "combined" ||
												plan.assignments?.some(
													(entry) => entry.ageGroup === group,
												),
										)
										.map((group) => (
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
												<PoolBoardColumns>
													{(["black", "white"] as const).map((side) =>
														view === "pool" ? (
															<TeamPool
																key={side}
																plan={plan}
																side={side}
																group={group}
															/>
														) : (
															<TeamSide
																key={side}
																plan={plan}
																side={side}
																group={group}
															/>
														),
													)}
												</PoolBoardColumns>
											</PoolBoardSection>
										))}
								</PoolBoardGroup>
								{plan.referees?.map((referee) => (
									<Text key={referee.side} variant="small">
										{referee.side === "black" ? "Black" : "White"} referee ·{" "}
										{memberName(data, referee.personId)}
									</Text>
								))}
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
				{generationDialog}
			</Stack>
		</LineupDialog>
	);
};
