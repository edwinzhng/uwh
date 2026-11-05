import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	AttendanceChart,
	EmptyState,
	LoadingContent,
	Row,
	SectionHeading,
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
		<Stack gap="heading">
			<SectionHeading
				action={
					<Select
						hideLabel
						compact
						label="Season"
						value={seasonId}
						options={data.seasons.map((season) => ({
							value: season.id,
							label: season.name,
						}))}
						onValueChange={onSeason}
					/>
				}
			>
				Attendance
			</SectionHeading>
			<Surface>
				<Stack>
					{summary.total > 0 ? (
						<Row gap="section" wrap>
							<Stack gap="xxs">
								<Text variant="number">
									{summary.attended === undefined
										? "N/A"
										: `${summary.attended}%`}
								</Text>
								<Text variant="small">Practices attended</Text>
								<Text variant="caption" tone="secondary">
									{summary.attendedCount} of {summary.total} available
								</Text>
								<Text variant="caption" tone="secondary">
									Of all completed eligible practices
								</Text>
							</Stack>
							<Stack gap="xxs">
								<Text variant="number">
									{summary.onTime === undefined ? "N/A" : `${summary.onTime}%`}
								</Text>
								<Text variant="small">On time</Text>
								<Text variant="caption" tone="secondary">
									Of practices attended
								</Text>
							</Stack>
						</Row>
					) : undefined}
					{summary.recorded > 0 ? (
						<Text variant="caption" tone="secondary">
							{summary.recorded} of {summary.total} sessions recorded
						</Text>
					) : undefined}
					{summary.recorded > 0 && summary.points.length ? (
						<AttendanceChart data={summary.points} />
					) : (
						<EmptyState
							title={
								summary.total
									? "Attendance not recorded"
									: "No attendance records"
							}
						/>
					)}
				</Stack>
			</Surface>
			{summary.records.length ? (
				<Stack gap="heading">
					<SectionHeading>Practice history</SectionHeading>
					<Surface variant="plain">
						<AttendanceRecords
							key={member.id + seasonId}
							records={summary.records}
						/>
					</Surface>
				</Stack>
			) : undefined}
		</Stack>
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
	) : summary === undefined ? (
		<LoadingContent />
	) : (
		<Text variant="small" tone="secondary">
			Attendance unavailable
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
