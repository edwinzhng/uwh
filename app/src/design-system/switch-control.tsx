import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import type { SwitchProps } from "./switch-props";
import { SwitchTrack } from "./switch-track";
import { geometry } from "./tokens";

export const SwitchControl = ({
	label,
	description,
	value,
	onValueChange,
	isDisabled,
}: SwitchProps): ReactElement => {
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessible
			focusable={!isDisabled}
			accessibilityRole="switch"
			accessibilityLabel={label}
			accessibilityHint={description}
			accessibilityState={{ checked: value, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={(): void => onValueChange(!value)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={{
				minWidth: geometry.touch,
				minHeight: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<SwitchTrack value={value} isFocused={focused} isDisabled={isDisabled} />
		</Pressable>
	);
};
