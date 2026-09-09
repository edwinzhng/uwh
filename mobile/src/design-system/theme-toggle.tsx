import type { ReactElement } from "react";
import { SegmentedControl } from "./segmented-control";
import type { ThemePreference } from "./theme";

type Props = {
	value: ThemePreference;
	onValueChange: (value: ThemePreference) => void;
};

export const ThemeToggle = ({ value, onValueChange }: Props): ReactElement => (
	<SegmentedControl
		label="Appearance"
		variant="icons"
		value={value}
		onValueChange={onValueChange}
		options={[
			{ value: "light", label: "Light theme", icon: "sun" },
			{ value: "dark", label: "Dark theme", icon: "moon" },
		]}
	/>
);
