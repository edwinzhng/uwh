import { Host, Icon, IconButton } from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";
import type { ReactElement } from "react";
import account from "../../assets/icons/toolbar-account.xml";
import bell from "../../assets/icons/toolbar-bell.xml";
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
			<IconButton
				colors={{ contentColor: theme.text.primary }}
				modifiers={[size(geometry.touch, geometry.touch)]}
				onClick={(): void => {
					haptic();
					onPress();
				}}
			>
				<Icon
					source={icon === "bell" ? bell : account}
					size={geometry.icon}
					contentDescription={label}
				/>
			</IconButton>
		</Host>
	);
};
