import * as Clipboard from "expo-clipboard";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	EmptyState,
	Grid,
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
import { type AgeGroup, formatTeams } from "../domain/player-coaching";
import { ConfirmButton } from "./confirm-button";
import { TeamOptions } from "./team-options";
import { TeamSide } from "./team-side";

export const TeamPanel = ({
	event,
	partId,
	readOnly = false,
}: {
	event: ClubEvent;
	partId?: string;
	readOnly?: boolean;
}): ReactElement => {
	const { data, account, dispatch, busy } = useApp();
	const [options, setOptions] = useState(false);
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
	return (
		<Stack gap="sm">
			<SectionHeading
				action={
					editable ? (
						<Button
							label={plan ? "Regenerate" : "Generate teams"}
							prefix="users"
							variant="secondary"
							isDisabled={
								busy || eventAttendees(data, event.id, partId).length < 2
							}
							onPress={(): void => setOptions(true)}
						/>
					) : undefined
				}
			>
				Teams
			</SectionHeading>
			<Surface>
				<Stack gap="md">
					{plan ? (
						<>
							<Row wrap>
								<Badge
									label={plan.published ? "Published" : "Draft"}
									kind={plan.published ? "success" : "neutral"}
								/>
								{stale ? (
									<Text variant="small" tone="warning">
										Lineup changed. Regenerate teams.
									</Text>
								) : undefined}
								{editable && plan.excludedPersonIds?.length ? (
									<Text variant="caption" tone="secondary">
										{plan.excludedPersonIds.length} excluded
									</Text>
								) : undefined}
							</Row>
							{groups
								.filter(
									(group) =>
										group === "combined" ||
										plan.assignments?.some((entry) => entry.ageGroup === group),
								)
								.map((group) => (
									<Stack key={group}>
										{group !== "combined" ? (
											<Text variant="label">
												{group === "adult" ? "Adults" : "Youth"}
											</Text>
										) : undefined}
										<Grid gap="md">
											{(["black", "white"] as const).map((side) => (
												<TeamSide
													key={side}
													plan={plan}
													side={side}
													group={group}
													editable={editable && !stale}
												/>
											))}
										</Grid>
									</Stack>
								))}
							<Row justify="end" wrap>
								<Button
									label={
										copyState === "copied"
											? "Copied"
											: copyState === "failed"
												? "Retry copy"
												: "Copy teams"
									}
									variant="secondary"
									isDisabled={stale}
									onPress={(): void => {
										void copy();
									}}
								/>
								{editable && !plan.published ? (
									<ConfirmButton
										label="Publish teams"
										title="Publish teams?"
										description="Share this lineup with players and parents."
										confirmLabel="Publish teams"
										isDisabled={busy || stale}
										onConfirm={() =>
											dispatch({
												type: "publish-teams",
												eventId: event.id,
												partId,
											})
										}
									/>
								) : undefined}
							</Row>
						</>
					) : (
						<EmptyState
							title={editable ? "No teams yet" : "Teams not published"}
							description={
								editable
									? "Generate teams once at least two players are attending."
									: "The lineup will appear here when a coach publishes it."
							}
						/>
					)}
					{options ? (
						<TeamOptions
							eventId={event.id}
							partId={partId}
							plan={plan}
							onClose={(): void => {
								setOptions(false);
								setCopyState("ready");
							}}
						/>
					) : undefined}
				</Stack>
			</Surface>
		</Stack>
	);
};
