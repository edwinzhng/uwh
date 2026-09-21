import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { Badge, Button, List, ListItem, Stack } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { attendanceSummary } from "../domain/attendance-summary";
export const AttendanceRecords = ({
	records,
}: {
	records: ReturnType<typeof attendanceSummary>["records"];
}): ReactElement => {
	const router = useRouter();
	const [visibleCount, setVisibleCount] = useState(5);
	const recent = records.slice().reverse();
	const items = recent.slice(0, visibleCount);
	return (
		<Stack gap="sm">
			<List>
				{items.map((record) => (
					<ListItem
						cardRow
						key={record.id}
						title={record.title}
						description={formatDate(record.date)}
						trailing={
							<Badge
								kind={
									record.attendance === "present"
										? "success"
										: record.attendance === "late"
											? "warning"
											: record.attendance === "absent"
												? "danger"
												: "neutral"
								}
								label={
									record.attendance === "present"
										? "On time"
										: record.attendance === "late"
											? "Late"
											: record.attendance === "absent"
												? "No-show"
												: "Not marked"
								}
							/>
						}
						onPress={() =>
							router.push({
								pathname: "/session",
								params: { event: record.id },
							})
						}
					/>
				))}
			</List>
			{visibleCount < recent.length ? (
				<Button
					label="See more"
					variant="ghost"
					onPress={(): void => setVisibleCount((count) => count + 5)}
				/>
			) : undefined}
		</Stack>
	);
};
