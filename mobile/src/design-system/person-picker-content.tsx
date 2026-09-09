import type { ReactElement } from "react";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import type { PersonChoice } from "./person-picker-props";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

export const PersonPickerContent = ({
	person,
	canSwitch = true,
}: {
	person: PersonChoice;
	canSwitch?: boolean;
}): ReactElement => (
	<Row gap="xs">
		<Avatar name={person.name} />
		<Stack gap="none">
			<Text variant="caption" tone="secondary">
				{canSwitch ? "Switch profile" : "Account"}
			</Text>
			<Text variant="label">{person.name.split(" ").at(0)}</Text>
		</Stack>
		<Icon name="chevronDown" size="sm" tone="secondary" />
	</Row>
);
