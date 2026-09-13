import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import {
	Badge,
	Button,
	EmptyState,
	LoadingContent,
	Row,
	Stack,
	Surface,
	Text,
	TrendChart,
} from "../design-system";

export const AttendanceComparison = ({
	seasonId,
	month,
	people,
	onRemove,
}: {
	seasonId: string;
	month: string;
	people: { id: string; name: string }[];
	onRemove: (id: string) => void;
}): ReactElement => {
	const data = useQuery(
		api.attendance_reports.comparison,
		people.length
			? {
					seasonId,
					month: month || undefined,
					personIds: people.map((person) => person.id),
				}
			: "skip",
	);
	return (
		<Surface>
			<Stack>
				<Row justify="between" wrap>
					<Text variant="h4">Compare players</Text>
					<Badge label={`${people.length}/4`} />
				</Row>
				<Row wrap>
					{people.map((person) => (
						<Button
							key={person.id}
							label={person.name}
							prefix="close"
							variant="secondary"
							onPress={(): void => onRemove(person.id)}
						/>
					))}
				</Row>
				{!people.length ? (
					<EmptyState
						title="Choose players to compare"
						description="Select up to four players in the table to compare their attendance."
					/>
				) : data?.limited ? (
					<Text tone="secondary">
						Choose a month to compare this large season.
					</Text>
				) : data && !data.rows.some((row) => row.points.length) ? (
					<EmptyState
						title="No attendance to compare"
						description="Record practice attendance or choose a different month to see trends."
					/>
				) : data ? (
					<TrendChart
						series={data.rows.map((row) => ({
							id: row.id,
							label: row.name,
							points: row.points,
						}))}
						formatValue={(value): string => `${value}%`}
					/>
				) : (
					<LoadingContent />
				)}
				<Text variant="caption" tone="secondary">
					Attendance uses recorded practices. On time uses attended practices.
				</Text>
			</Stack>
		</Surface>
	);
};
