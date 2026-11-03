import { Button, Host } from "@expo/ui/swift-ui";
import {
	buttonStyle,
	frame,
	labelStyle,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import type { ReactElement } from "react";
import { useButtonHaptics } from "./haptics";
import { useTheme } from "./theme";
import { geometry } from "./tokens";
import type { ToolbarButtonProps } from "./toolbar-button-props";

export const NativeToolbarButton = ({
	icon,
	label,
	onPress,
}: ToolbarButtonProps): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	return (
		<Host
			colorScheme={theme.mode}
			style={{ width: geometry.touch, height: geometry.touch }}
		>
			<Button
				label={label}
				systemImage={icon === "bell" ? "bell" : "person.crop.circle"}
				onPress={(): void => {
					haptic();
					onPress();
				}}
				modifiers={[
					buttonStyle("plain"),
					labelStyle("iconOnly"),
					tint(theme.text.primary),
					frame({ width: geometry.touch, height: geometry.touch }),
				]}
			/>
		</Host>
	);
};
