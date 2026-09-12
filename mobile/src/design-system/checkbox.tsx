import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { geometry, space } from "./tokens";

export const Checkbox = ({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}): ReactElement => (
	<Pressable
		accessibilityRole="checkbox"
		accessibilityLabel={label}
		accessibilityState={{ checked }}
		onPress={(): void => onChange(!checked)}
		style={{
			flexDirection: "row",
			alignItems: "center",
			gap: space.xs,
			minHeight: geometry.listRow,
			cursor: "pointer",
		}}
	>
		<Icon name={checked ? "checkboxChecked" : "stop"} size="sm" />
		<Text variant="small">{label}</Text>
	</Pressable>
);
