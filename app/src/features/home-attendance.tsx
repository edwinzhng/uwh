import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	featureIdentity,
	Row,
	SegmentedControl,
	Stack,
	SummaryCard,
	Text,
	usePageLoading,
} from "../design-system";
import type { Member, Season } from "../domain/app-types";
import { formatPoolTime, homeAttendance } from "../domain/home-attendance";
import { useClubToday } from "./use-club-today";

type Props = { person: Member; season?: Season; now: number };
type Metric = "practices" | "hours";
const options: { value: Metric; label: string }[] = [
	{ value: "hours", label: "Hours" },
	{ value: "practices", label: "Practices" },
];

const AttendanceCard = ({
	result,
	season,
	loading,
	competition,
}: {
	result?: ReturnType<typeof homeAttendance> | null;
	season?: Season;
	loading: boolean;
	competition?: {
		minutes?: { best: number; rank?: number };
		practices?: { best: number; rank?: number };
	} | null;
}): ReactElement => {
	const [metric, setMetric] = useState<Metric>("hours");
	return (
		<SummaryCard
			title="This season"
			variant="metric"
			icon={featureIdentity.schedule.icon}
			category={featureIdentity.schedule.category}
			compact
		>
			{!season ? (
				<Text tone="secondary">No current season.</Text>
			) : loading ? (
				<Text tone="secondary">Loading attendance…</Text>
			) : !result ? (
				<Text tone="secondary">Attendance unavailable.</Text>
			) : (
				<Stack gap="xs">
					<Row justify="between" gap="xs" align="center">
						<Stack grow gap="none">
							<Text variant="number">
								{metric === "practices"
									? result.practices
									: formatPoolTime(result.minutes)}
							</Text>
							<Text variant="small">
								{metric === "practices"
									? "practices attended"
									: "scheduled practice time"}
							</Text>
						</Stack>
						<SegmentedControl
							label="Season attendance metric"
							hideLabel
							value={metric}
							options={options}
							onValueChange={setMetric}
						/>
					</Row>
					{competition?.[metric === "hours" ? "minutes" : "practices"] ? (
						<Text variant="caption" tone="secondary">
							Club best{" "}
							{metric === "hours"
								? formatPoolTime(competition.minutes?.best ?? 0)
								: `${competition.practices?.best} practices`}{" "}
							{competition[metric === "hours" ? "minutes" : "practices"]?.rank
								? `· Your rank #${competition[metric === "hours" ? "minutes" : "practices"]?.rank}`
								: ""}
						</Text>
					) : undefined}
					<Text variant="caption" tone="secondary">
						{season.name} · Based on RSVPs and attendance; hours are scheduled.
					</Text>
				</Stack>
			)}
		</SummaryCard>
	);
};

const LiveAttendance = ({ person, season, now }: Props): ReactElement => {
	const result = useQuery(
		api.attendance.home,
		season ? { personId: person.id, seasonId: season.id, now } : "skip",
	);
	const competition = useQuery(
		api.attendance.competition,
		season ? { personId: person.id, seasonId: season.id, now } : "skip",
	);
	usePageLoading(Boolean(season) && result === undefined);
	return (
		<AttendanceCard
			season={season}
			result={result}
			competition={competition}
			loading={Boolean(season) && result === undefined}
		/>
	);
};

const PreviewAttendance = ({ person, season, now }: Props): ReactElement => {
	const { data } = useApp();
	return (
		<AttendanceCard
			season={season}
			result={season ? homeAttendance(data, person, season.id, now) : undefined}
			loading={false}
		/>
	);
};

export const HomeAttendance = ({ now }: { now: number }): ReactElement => {
	const person = useActivePerson();
	const { data, source } = useApp();
	const today = useClubToday();
	const season = data.seasons.find(
		(entry) => entry.start <= today && entry.end >= today,
	);
	return source === "convex" ? (
		<LiveAttendance key={person.id} person={person} season={season} now={now} />
	) : (
		<PreviewAttendance
			key={person.id}
			person={person}
			season={season}
			now={now}
		/>
	);
};
