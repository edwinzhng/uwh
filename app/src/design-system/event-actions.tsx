import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Button } from "./button";
import { Stack } from "./stack";
import { Text } from "./text";
import { geometry, space } from "./tokens";

type Props = {
	status: ReactNode;
	attendanceCount: number;
	onAttendance: () => void;
};

export const EventActions = ({
	status,
	attendanceCount,
	onAttendance,
}: Props): ReactElement => (
	<View
		style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}
	>
		<View style={{ width: geometry.popupWidth, flexShrink: 1, minWidth: 0 }}>
			{status}
		</View>
		<Stack gap="xs">
			<Text variant="caption" tone="secondary">
				Attendance
			</Text>
			<Button
				label={String(attendanceCount)}
				accessibilityLabel={`Attendance, ${attendanceCount} going`}
				prefix="users"
				variant="secondary"
				onPress={onAttendance}
			/>
		</Stack>
	</View>
);
