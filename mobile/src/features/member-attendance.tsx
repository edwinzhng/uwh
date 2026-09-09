import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	AttendanceChart,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { attendanceSummary } from "../domain/attendance-summary";
import { AttendanceRecords } from "./attendance-records";

type Summary = ReturnType<typeof attendanceSummary>;
type ContentProps = {
	member: Member;
	seasonId: string;
	onSeason: (value: string | undefined) => void;
	summary: Summary;
};
const AttendanceContent = ({
	member,
	seasonId,
	onSeason,
	summary,
}: ContentProps): ReactElement => {
	const { data } = useApp();
	return (
		<Surface>
			<Stack>
				<Row justify="between" wrap>
					<Text variant="h4">Attendance</Text>
					<Select
						label="Season"
						value={seasonId}
						options={data.seasons.map((season) => ({
							value: season.id,
							label: season.name,
						}))}
						onValueChange={onSeason}
					/>
				</Row>
				<Row gap="xl" wrap>
					<Stack gap="xxs">
						<Text variant="h2">
							{summary.attended === undefined ? "—" : `${summary.attended}%`}
						</Text>
						<Text variant="small">Practices attended</Text>
						<Text variant="caption" tone="secondary">
							Of recorded practices
						</Text>
					</Stack>
					<Stack gap="xxs">
						<Text variant="h2">
							{summary.onTime === undefined ? "—" : `${summary.onTime}%`}
						</Text>
						<Text variant="small">On time</Text>
						<Text variant="caption" tone="secondary">
							Of practices attended
						</Text>
					</Stack>
				</Row>
				{summary.points.length ? (
					<AttendanceChart data={summary.points} />
				) : (
					<Text variant="small" tone="secondary">
						No completed practices this season
					</Text>
				)}
				<Text variant="caption" tone="secondary">
					{summary.recorded} of {summary.total} practices recorded ·{" "}
					{summary.total - summary.recorded} unmarked
				</Text>
				<AttendanceRecords
					key={member.id + seasonId}
					records={summary.records}
				/>
			</Stack>
		</Surface>
	);
};

const LiveAttendance = ({
	member,
	seasonId,
	onSeason,
	now,
}: {
	member: Member;
	seasonId: string;
	onSeason: (value: string | undefined) => void;
	now: number;
}): ReactElement => {
	const summary = useQuery(api.attendance.summary, {
		personId: member.id,
		seasonId,
		now,
	});
	return summary ? (
		<AttendanceContent
			member={member}
			seasonId={seasonId}
			onSeason={onSeason}
			summary={summary}
		/>
	) : (
		<Text variant="small" tone="secondary">
			{summary === undefined ? "Loading attendance…" : "Attendance unavailable"}
		</Text>
	);
};
export const MemberAttendance = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { data, source } = useApp();
	const [selected, setSelected] = useState<string>();
	const [now] = useState(Date.now);
	const seasonId = selected ?? data.seasons.at(-1)?.id ?? "2026-2027";
	return source === "convex" ? (
		<LiveAttendance
			member={member}
			seasonId={seasonId}
			onSeason={setSelected}
			now={now}
		/>
	) : (
		<AttendanceContent
			member={member}
			seasonId={seasonId}
			onSeason={setSelected}
			summary={attendanceSummary(data, member, seasonId, now)}
		/>
	);
};
