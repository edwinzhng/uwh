import * as Clipboard from "expo-clipboard";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Button, Grid, Row, Stack, Text } from "../design-system";
import {
	canCoach,
	eventAttendees,
	lineupNeedsReview,
} from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { type AgeGroup, formatTeams } from "../domain/player-coaching";
import { TeamOptions } from "./team-options";
import { TeamSide } from "./team-side";

export const TeamPanel = ({
	event,
	readOnly = false,
}: {
	event: ClubEvent;
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
		(entry) => entry.eventId === event.id && (!readOnly || entry.published),
	);
	const stale = plan ? lineupNeedsReview(data, plan) : false;
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
		<Stack gap="md">
			<Row justify="between" wrap>
				<Text variant="h4">Teams</Text>
				{editable ? (
					<Button
						label={plan ? "Regenerate" : "Generate teams"}
						prefix="users"
						variant="secondary"
						isDisabled={busy || eventAttendees(data, event.id).length < 2}
						onPress={(): void => setOptions(true)}
					/>
				) : undefined}
			</Row>
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
							<Button
								label="Publish teams"
								isDisabled={busy || stale}
								onPress={(): void => {
									void dispatch({ type: "publish-teams", eventId: event.id });
								}}
							/>
						) : undefined}
					</Row>
				</>
			) : (
				<Text variant="small" tone="secondary">
					{editable ? "No teams" : "Teams not published"}
				</Text>
			)}
			{options ? (
				<TeamOptions
					eventId={event.id}
					plan={plan}
					onClose={(): void => {
						setOptions(false);
						setCopyState("ready");
					}}
				/>
			) : undefined}
		</Stack>
	);
};
