import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Badge, List, ListItem } from "../design-system";
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
			)}
		</LocalPage>
	);
};
