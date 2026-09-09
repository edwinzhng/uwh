import type { ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import type { PersonChoice } from "./person-picker-props";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { geometry } from "./tokens";

export const PersonPickerContent = ({
	person,
	canSwitch = true,
}: {
	person: PersonChoice;
	canSwitch?: boolean;
}): ReactElement => {
	const { width } = useWindowDimensions();
	return (
		<Row gap="xs">
			<Avatar name={person.name} />
			{width >= geometry.narrow ? (
				<Stack gap="none">
					<Text variant="caption" tone="secondary">
						{canSwitch ? "Switch profile" : "Account"}
					</Text>
					<Text variant="label">{person.name.split(" ").at(0)}</Text>
				</Stack>
			) : undefined}
			<Icon name="chevronDown" size="sm" tone="secondary" />
		</Row>
	);
};
