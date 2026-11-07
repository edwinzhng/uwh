import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewCoachingSchedule } from "../demo/coaching-schedule-state";
import { previewMemberProfiles } from "../demo/member-profile-state";
import { Row, Stack, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { ClubEvent, Season } from "../domain/app-types";
import { type CoachHomeStats, coachHomeStats } from "../domain/coach-home";
import { eventTimeRange } from "../domain/event-card-presentation";
import { effectivePracticeCoaches } from "../domain/event-coaching";
import { clubDate, clubTimestamp } from "../domain/event-time";
import { practiceEvent } from "../domain/event-types";
import { venueName } from "../domain/venue";
import { previewCoachAssignments } from "./use-event-coaches";

type Data = {
	stats: CoachHomeStats;
	nextPractice?: ClubEvent;
	morePractices: boolean;
};
type CoachCard = "club_stats" | "practice_progress" | "next_coaching";
const CoachCards = ({
	value,
	season,
	card,
}: {
	value?: Data;
	season?: Season;
	card: CoachCard;
}): ReactElement => {
	const router = useRouter();
	if (!season)
		return (
			<SummaryCard title="Club stats" compact>
				<Text tone="secondary">No current season.</Text>
			</SummaryCard>
		);
	if (!value)
		return (
			<SummaryCard title="Club stats" compact>
				<Text tone="secondary">Loading club stats…</Text>
			</SummaryCard>
		);
	if (card === "club_stats")
		return (
			<SummaryCard title="Total players" compact icon="users">
				<Stack gap="xs">
					<Text variant="number">{value.stats.players}</Text>
					<Text variant="small">
						{value.stats.youth} youth (U19) · {value.stats.women} women
					</Text>
					{value.stats.divisions.map((division) => (
						<Row key={division.label} justify="between" gap="xs">
							<Text variant="caption">{division.label}</Text>
							<Text variant="caption" weight="semibold">
								{division.count}
							</Text>
						</Row>
					))}
					{value.stats.unknownDivisions ? (
						<Text variant="caption" tone="secondary">
							{value.stats.unknownDivisions} without a division
						</Text>
					) : undefined}
				</Stack>
			</SummaryCard>
		);
	if (card === "practice_progress")
		return (
			<SummaryCard title="Practices done" compact icon="calendar">
				<Text variant="number">
					{value.stats.practicesDone}/{value.stats.practicesTotal}
				</Text>
				<Text variant="caption" tone="secondary">
					{season.name} · Club practices
				</Text>
			</SummaryCard>
		);
	return (
		<SummaryCard
			title="Next coaching practice"
			compact
			icon="calendar"
			onPress={
				value.nextPractice
					? (): void =>
							router.push({
								pathname: "/session",
								params: { event: value.nextPractice?.id, tab: "coaching" },
							})
					: undefined
			}
		>
			{value.nextPractice ? (
				<Stack gap="xxs">
					<Text variant="h4">{value.nextPractice.title}</Text>
					<Text variant="small" tone="secondary">
						{formatDate(value.nextPractice.date)} ·{" "}
						{eventTimeRange(value.nextPractice.start, value.nextPractice.end)} ·{" "}
						{venueName(value.nextPractice.venue)}
					</Text>
					<Text variant="caption">Plan practice and make teams</Text>
				</Stack>
			) : (
				<Text variant="small" tone="secondary">
					{value.morePractices
						? "No assigned practice in the next sessions checked. Open the coaching schedule for more."
						: "No upcoming coaching assignment."}
				</Text>
			)}
		</SummaryCard>
	);
};
const LiveCards = ({
	season,
	now,
	card,
}: {
	season?: Season;
	now: number;
	card: CoachCard;
}): ReactElement => {
	const value = useQuery(
		api.coach_home.read,
		season ? { seasonId: season.id, now } : "skip",
	);
	return <CoachCards season={season} value={value} card={card} />;
};
const PreviewCards = ({
	season,
	now,
	card,
}: {
	season?: Season;
	now: number;
	card: CoachCard;
}): ReactElement => {
	const { data, account, accounts } = useApp();
	const profiles = useAtomValue(previewMemberProfiles);
	const schedule = useAtomValue(previewCoachingSchedule);
	const assignments = useAtomValue(previewCoachAssignments);
	const coaches = accounts
		.filter((entry) => entry.coachPrograms.length > 0)
		.map((entry) => ({
			coachId: entry.id,
			personId: entry.personId,
			name: entry.name,
			programIds: entry.coachPrograms,
		}));
	const upcoming = data.events
		.filter(
			(event) =>
				!event.cancelled &&
				practiceEvent(event) &&
				clubTimestamp(
					event.endDate ?? event.date,
					event.end,
					event.timeZone ?? data.timeZone,
				) > now,
		)
		.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
	const nextPractice = upcoming.find((event) =>
		effectivePracticeCoaches(
			event,
			schedule,
			coaches,
			assignments[event.id],
		).some((entry) => entry.coachId === account.id),
	);
	const details = data.members.map((member) => ({
		personId: member.id,
		birthDate: profiles[member.id]?.birthDate,
		gender:
			profiles[member.id]?.competitionGender ??
			data.playerCoaching?.find((entry) => entry.personId === member.id)
				?.gender,
	}));
	return (
		<CoachCards
			card={card}
			season={season}
			value={
				season
					? {
							stats: coachHomeStats(
								data.members,
								details,
								data.events,
								season,
								now,
								data.timeZone,
							),
							nextPractice,
							morePractices: false,
						}
					: undefined
			}
		/>
	);
};
export const CoachHomeCards = ({
	now,
	card,
}: {
	now: number;
	card: CoachCard;
}): ReactElement => {
	const { data, source } = useApp();
	const today = clubDate(now, data.timeZone);
	const season = data.seasons.find(
		(entry) => entry.start <= today && entry.end >= today,
	);
	return source === "convex" ? (
		<LiveCards season={season} now={now} card={card} />
	) : (
		<PreviewCards season={season} now={now} card={card} />
	);
};
