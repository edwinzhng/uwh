import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "expo-router";
import { type ReactElement, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	AttendancePlayerRow,
	EmptyState,
	FilterFields,
	InfiniteScroll,
	LoadingContent,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
	TrendChart,
} from "../design-system";
import {
	type AttendanceBand,
	type AttendanceSort,
	attendanceDashboardRows,
} from "../domain/attendance-dashboard";
import { useClubNow } from "./use-club-now";

export const AttendanceDashboard = ({
	seasonId,
	month,
	programId,
	weekday,
	search,
}: {
	seasonId: string;
	month?: string;
	programId?: string;
	weekday?: number;
	search: string;
}): ReactElement => {
	const now = useClubNow();
	const pending = useQuery(api.attendance_reports.dashboard, {
		seasonId,
		month,
		programId,
		weekday,
		now,
	});
	const previous =
		useRef<FunctionReturnType<typeof api.attendance_reports.dashboard>>(
			undefined,
		);
	if (pending) previous.current = pending;
	const result = pending ?? previous.current;
	const router = useRouter();
	const [sort, setSort] = useState<AttendanceSort>("highest");
	const [band, setBand] = useState<AttendanceBand>("all");
	const [visible, setVisible] = useState(30);
	if (!result) return <LoadingContent />;
	if (result.limited)
		return (
			<EmptyState
				title="Choose a smaller period"
				description="This range is too large for a complete report. Choose a month to see accurate totals and rankings."
			/>
		);
	const rows = attendanceDashboardRows(result.rows, sort, band, search);
	return (
		<Stack gap="lg">
			<Text variant="caption" tone="secondary">
				{pending
					? "Complete report · sorted across the full roster"
					: "Updating report… previous results shown"}
			</Text>
			<Surface>
				<Stack gap="sm">
					<Row justify="between" gap="sm" wrap>
						<Stack gap="xxs">
							<Text variant="number">
								{result.rate === undefined ? "—" : `${result.rate}%`}
							</Text>
							<Text variant="small">Attendance</Text>
							<Text variant="caption" tone="secondary">
								{result.attended}/{result.available} available
							</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="number">
								{result.coverage === undefined ? "—" : `${result.coverage}%`}
							</Text>
							<Text variant="small">Recorded</Text>
							<Text variant="caption" tone="secondary">
								{result.recorded}/{result.available} records
							</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="number">{result.declining}</Text>
							<Text variant="small">Declining</Text>
							<Text variant="caption" tone="secondary">
								{result.players} eligible players
							</Text>
						</Stack>
					</Row>
					<Text variant="caption" tone="secondary">
						Attended ÷ all completed eligible sessions. Unmarked sessions stay
						in the total; a Yes RSVP counts until a coach records otherwise.
					</Text>
				</Stack>
			</Surface>
			{result.points.length > 1 ? (
				<Surface>
					<Stack gap="sm">
						<SectionHeading>Attendance over time</SectionHeading>
						<TrendChart
							maximum={100}
							series={[
								{
									id: "attendance",
									label: "Attendance",
									points: result.points,
								},
							]}
							formatValue={(value): string => `${Math.round(value)}%`}
						/>
					</Stack>
				</Surface>
			) : undefined}
			<FilterFields>
				<Select
					label="Show"
					value={band}
					options={[
						{ value: "all", label: "All players" },
						{ value: "high", label: "High · 80%+" },
						{ value: "low", label: "Low · under 50%" },
						{ value: "declining", label: "Declining" },
					]}
					onValueChange={(value): void => {
						if (
							value === "all" ||
							value === "high" ||
							value === "low" ||
							value === "declining"
						) {
							setBand(value);
							setVisible(30);
						}
					}}
				/>
				<Select
					label="Sort"
					value={sort}
					options={[
						{ value: "highest", label: "Highest attendance" },
						{ value: "lowest", label: "Lowest attendance" },
						{ value: "declining", label: "Largest decline" },
						{ value: "name", label: "Name" },
					]}
					onValueChange={(value): void => {
						if (
							value === "highest" ||
							value === "lowest" ||
							value === "declining" ||
							value === "name"
						) {
							setSort(value);
							setVisible(30);
						}
					}}
				/>
			</FilterFields>
			<SectionHeading>
				{rows.length} players · {result.events} completed sessions
			</SectionHeading>
			<Stack gap="xs">
				{rows.slice(0, visible).map((row) => (
					<AttendancePlayerRow
						key={row.id}
						row={row}
						onPress={(): void =>
							router.push({
								pathname: "/member",
								params: { id: row.id, tab: "attendance" },
							})
						}
					/>
				))}
			</Stack>
			{!rows.length ? (
				<EmptyState
					title="No players match"
					description="Try another program, day, period or attendance filter."
				/>
			) : undefined}
			<InfiniteScroll
				revision={visible}
				loadMore={
					visible < rows.length
						? (): void => setVisible((count) => count + 30)
						: undefined
				}
			/>
		</Stack>
	);
};
