import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Badge, ListItem, Stack } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { attendanceSummary } from "../domain/attendance-summary";
import { LocalPage } from "./local-page";
export const AttendanceRecords = ({
	records,
}: {
	records: ReturnType<typeof attendanceSummary>["records"];
}): ReactElement => {
	const router = useRouter();
	return (
		<LocalPage items={records.toReversed()}>
			{(items) => (
				<Stack gap="xs">
					{items.map((record) => (
						<ListItem
							flush
							key={record.id}
							title={record.title}
							description={formatDate(record.date)}
							trailing={
								<Badge
									label={
										record.attendance === "present"
											? "On time"
											: record.attendance === "late"
												? "Late"
												: record.attendance === "absent"
													? "No-show"
													: "Unmarked"
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
				</Stack>
			)}
		</LocalPage>
	);
};
