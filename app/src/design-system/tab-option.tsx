import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { Badge } from "./badge";
import { Text } from "./text";
import { geometry, space } from "./tokens";
export type TabOptionProps = {
	label: string;
	staffRole?: "coach" | "admin";
	selected: boolean;
	disabled?: boolean;
	onPress: () => void;
};
export const TabOption = ({
	label,
	staffRole,
	selected,
	disabled,
	onPress,
}: TabOptionProps): ReactElement => (
	<Pressable
		accessibilityRole="tab"
		accessibilityState={{ selected, disabled }}
		accessibilityLabel={label}
		disabled={disabled}
		onPress={onPress}
		style={{
			minHeight: geometry.touch,
			flexDirection: "row",
			alignItems: "center",
			gap: space.xs,
			justifyContent: "center",
			paddingHorizontal: space.xs,
		}}
	>
		{label.toLowerCase() !== staffRole ? (
			<Text variant="label" tone={selected ? "primary" : "secondary"}>
				{label}
			</Text>
		) : undefined}
		{staffRole ? (
			<Badge
				label={staffRole === "coach" ? "Coach" : "Admin"}
				kind={staffRole}
				compact
			/>
		) : undefined}
	</Pressable>
);
