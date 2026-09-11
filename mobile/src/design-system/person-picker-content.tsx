import type { ReactElement } from "react";
import { useWindowDimensions, View } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import type { PersonChoice } from "./person-picker-props";
import { Row } from "./row";
import { Text } from "./text";
import { geometry } from "./tokens";

export const PersonPickerContent = ({
	person,
	canSwitch = true,
}: {
	person: PersonChoice;
	canSwitch?: boolean;
}): ReactElement => {
	const wide = useWindowDimensions().width >= geometry.wide;
	return (
		<Row gap="xs">
			<Avatar name={person.name} compact />

			<View
				style={{
					minWidth: 0,
					maxWidth: wide ? undefined : 112,
					flexGrow: wide ? 1 : 0,
					flexShrink: 1,
				}}
			>
				<Text variant="caption" tone="secondary" lines={1}>
					{canSwitch ? "Switch profile" : "Account"}
				</Text>
				<Text variant="caption" lines={1}>
					{person.name}
				</Text>
			</View>

			<Icon name="chevronDown" size="sm" tone="secondary" />
		</Row>
	);
};
