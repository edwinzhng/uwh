import type { ReactElement } from "react";
import { ScrollView, View } from "react-native";
import type { AttendanceReportRow } from "../domain/attendance-report";
import { Badge } from "./badge";
import { Button } from "./button";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { Toggle } from "./toggle";
import { corners, geometry, space } from "./tokens";

type EventColumn = { id: string; date: string; start: string; title: string };
type Props = {
	events: EventColumn[];
	rows: AttendanceReportRow[];
	selected: string[];
	onSelect: (id: string) => void;
	onMember: (id: string) => void;
	onEvent: (id: string) => void;
};
const percent = (value?: number): string =>
	value === undefined ? "—" : `${value}%`;
export const AttendanceMatrix = ({
	events,
	rows,
	selected,
	onSelect,
	onMember,
	onEvent,
}: Props): ReactElement => {
	const theme = useTheme();
	const column = geometry.popupWidth - space.xxl;
	return (
		<ScrollView
			horizontal
			accessibilityLabel="Attendance records"
			style={{
				borderWidth: geometry.border,
				borderColor: theme.border,
				borderRadius: corners.panel,
			}}
		>
			<View>
				<View
					style={{
						flexDirection: "row",
						backgroundColor: theme.background.secondary,
					}}
				>
					<View style={{ width: geometry.column, padding: space.sm }}>
						<Text variant="label">Player</Text>
						<Text variant="caption" tone="secondary">
							Attendance · On time
						</Text>
					</View>
					{events.map((event) => (
						<View key={event.id} style={{ width: column, padding: space.xs }}>
							<Button
								variant="ghost"
								label={event.date.slice(5)}
								onPress={(): void => onEvent(event.id)}
							/>
							<Text variant="caption">
								{event.start} · {event.title}
							</Text>
						</View>
					))}
				</View>
				{rows.map((row) => (
					<View
						key={row.id}
						style={{
							flexDirection: "row",
							borderTopWidth: geometry.border,
							borderColor: theme.border,
						}}
					>
						<View style={{ width: geometry.column, padding: space.sm }}>
							<Stack gap="xs">
								<Button
									variant="ghost"
									label={row.name}
									onPress={(): void => onMember(row.id)}
								/>
								<Text variant="small">
									{percent(row.attended)} attended · {percent(row.onTime)} on
									time
								</Text>
								<Text variant="caption" tone="secondary">
									{row.recorded}/{row.total} recorded · {row.additions} added
									late · {row.cancellations} cancelled late
								</Text>
								<Toggle
									label={`Compare ${row.name}`}
									value={selected.includes(row.id)}
									isDisabled={
										!selected.includes(row.id) && selected.length >= 4
									}
									onValueChange={(): void => onSelect(row.id)}
								/>
							</Stack>
						</View>
						{events.map((event) => {
							const cell = row.cells.find(
								(entry) => entry.eventId === event.id,
							);
							const status = cell?.attendance;
							return (
								<View
									key={event.id}
									style={{
										width: column,
										padding: space.sm,
										justifyContent: "center",
									}}
								>
									<Stack gap="xs">
										<Badge
											label={
												status === "present"
													? "On time"
													: status === "late"
														? "Late"
														: status === "absent"
															? "No-show"
															: status === "unmarked"
																? "Unmarked"
																: "Not eligible"
											}
											kind={
												status === "present"
													? "success"
													: status === "late"
														? "warning"
														: status === "absent"
															? "danger"
															: "neutral"
											}
										/>
										{cell?.flag ? (
											<Text variant="caption" tone="secondary">
												{cell.flag === "addition"
													? "Late addition"
													: "Late cancellation"}
											</Text>
										) : undefined}
									</Stack>
								</View>
							);
						})}
					</View>
				))}
			</View>
		</ScrollView>
	);
};
