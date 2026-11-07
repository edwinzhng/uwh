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
import {
	type CoachHomePlayers,
	coachHomePlayers,
	coachHomePracticeEnds,
	coachingPracticeEnd,
} from "../domain/coach-home";
import { eventTimeRange } from "../domain/event-card-presentation";
import { effectivePracticeCoaches } from "../domain/event-coaching";
import { clubDate } from "../domain/event-time";
import { practiceEvent } from "../domain/event-types";
import { venueName } from "../domain/venue";
import { previewCoachAssignments } from "./use-event-coaches";

type Data = {
	players?: CoachHomePlayers;
	practiceEnds?: number[];
	nextPractice?: ClubEvent;
	morePractices?: boolean;
};
type CoachCard = "club_stats" | "practice_progress" | "next_coaching";
const CoachCards = ({
	value,
	season,
	card,
	now,
}: {
	value?: Data | null;
	now: number;
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
	if (value === undefined)
		return (
			<SummaryCard title="Club stats" compact>
				<Text tone="secondary">Loading club stats…</Text>
			</SummaryCard>
		);
	if (value === null)
		return (
			<SummaryCard title="Club stats" compact>
				<Text tone="secondary">Club stats are unavailable.</Text>
			</SummaryCard>
		);
	if (card === "club_stats" && value.players)
		return (
			<SummaryCard title="Total players" compact icon="users">
				<Stack gap="xs">
					<Text variant="number">{value.players.players}</Text>
					<Text variant="small">
						{value.players.youth} youth (U19) · {value.players.women} women
					</Text>
					{value.players.divisions.map((division) => (
						<Row key={division.label} justify="between" gap="xs">
							<Text variant="caption">{division.label}</Text>
							<Text variant="caption" weight="semibold">
								{division.count}
							</Text>
						</Row>
					))}
					{value.players.unknownDivisions ? (
						<Text variant="caption" tone="secondary">
							{value.players.unknownDivisions} without a division
						</Text>
					) : undefined}
				</Stack>
			</SummaryCard>
		);
	if (card === "practice_progress" && value.practiceEnds)
		return (
			<SummaryCard title="Practices done" compact icon="calendar">
				<Text variant="number">
					{value.practiceEnds.filter((end) => end <= now).length}/
					{value.practiceEnds.length}
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
	const { data } = useApp();
	const players = useQuery(
		api.coach_home.players,
		season && card === "club_stats" ? { seasonId: season.id } : "skip",
	);
	const practiceEnds = useQuery(
		api.coach_home.practiceEnds,
		season && card === "practice_progress" ? { seasonId: season.id } : "skip",
	);
	const upcoming = useQuery(
		api.coach_home.upcoming,
		season && card === "next_coaching"
			? { day: clubDate(now, data.timeZone) }
			: "skip",
	);
	const value =
		card === "club_stats"
			? players && { players }
			: card === "practice_progress"
				? practiceEnds && { practiceEnds }
				: upcoming && {
						nextPractice: upcoming.practices.find(({ endsAt }) => endsAt > now)
							?.event,
						morePractices: upcoming.morePractices,
					};
	return <CoachCards season={season} value={value} card={card} now={now} />;
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
	const nextPractice =
		card === "next_coaching"
			? data.events
					.filter((event) => !event.cancelled && practiceEvent(event))
					.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
					.find((event) => {
						const effective = effectivePracticeCoaches(
							event,
							schedule,
							coaches,
							assignments[event.id],
						);
						const end = coachingPracticeEnd(
							event,
							effective,
							account.id,
							data.timeZone,
						);
						return end !== undefined && end > now;
					})
			: undefined;
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
			now={now}
			value={
				season
					? {
							players:
								card === "club_stats"
									? coachHomePlayers(data.members, details, season)
									: undefined,
							practiceEnds:
								card === "practice_progress"
									? coachHomePracticeEnds(data.events, season, data.timeZone)
									: undefined,
							nextPractice,
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
