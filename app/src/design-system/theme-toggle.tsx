import type { ReactElement } from "react";
import { Row } from "./row";
import { SegmentedControl } from "./segmented-control";
import { Text } from "./text";
import type { ThemePreference } from "./theme";

type Props = {
	value: ThemePreference;
	onValueChange: (value: ThemePreference) => void;
};

export const ThemeToggle = ({ value, onValueChange }: Props): ReactElement => (
	<Row justify="between" wrap>
		<Text>Appearance</Text>
		<SegmentedControl
			label="Appearance"
			hideLabel
			variant="icons"
			value={value}
			onValueChange={onValueChange}
			options={[
				{ value: "system", label: "System theme", icon: "monitor" },
				{ value: "light", label: "Light theme", icon: "sun" },
				{ value: "dark", label: "Dark theme", icon: "moon" },
			]}
		/>
	</Row>
);
