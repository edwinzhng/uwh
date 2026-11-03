import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const MessageComposerSurface = ({
	children,
	leading,
	trailing,
	accessory,
}: {
	children: ReactNode;
	leading?: ReactNode;
	trailing?: ReactNode;
	accessory?: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.xxs,
				minWidth: 0,
			}}
		>
			{leading ? <View>{leading}</View> : undefined}
			<View
				style={{
					flex: 1,
					flexDirection: "row",
					alignItems: "center",
					minWidth: 0,
					backgroundColor: theme.background.tertiary,
					borderRadius: geometry.touch / 2,
					minHeight: geometry.touch,
					overflow: "hidden",
				}}
			>
				{children}
				{accessory ? <View>{accessory}</View> : undefined}
			</View>
			{trailing ? <View>{trailing}</View> : undefined}
		</View>
	);
};
