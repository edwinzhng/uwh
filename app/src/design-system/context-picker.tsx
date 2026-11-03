import type { ReactElement } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { contextPickerPresentation } from "./context-picker-model";
import { NativePicker } from "./native-picker";
import type { ChoiceOption } from "./picker-props";
import { Select } from "./select";
import { geometry } from "./tokens";

export const ContextPicker = <T extends string>({
	label,
	value,
	options,
	onValueChange,
	presentation = "automatic",
}: {
	label: string;
	value: T;
	options: readonly ChoiceOption<T>[];
	onValueChange: (value: T) => void;
	presentation?: "automatic" | "sheet" | "menu";
}): ReactElement => {
	const { width } = useWindowDimensions();
	const Picker =
		contextPickerPresentation({
			platform: Platform.OS,
			width,
			breakpoint: geometry.wide,
			requested: presentation,
		}) === "sheet"
			? NativePicker
			: Select;
	return (
		<Picker
			label={label}
			hideLabel
			appearance="context"
			value={value}
			options={options}
			isDisabled={!options.some((option) => !option.isDisabled)}
			onValueChange={(next): void => {
				if (next !== undefined && next !== value) onValueChange(next);
			}}
		/>
	);
};
