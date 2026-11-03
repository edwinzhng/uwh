import type { ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";
import { useTheme } from "./theme";
import { space } from "./tokens";
export const ActionToaster = (): ReactElement => {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const toastWidth = Math.min(
		356,
		width - insets.left - insets.right - space.md * 2,
	);
	return (
		<Toaster
			position="bottom-center"
			offset={insets.bottom + space.md}
			positionerStyle={{
				left:
					insets.left + (width - insets.left - insets.right - toastWidth) / 2,
				right: undefined,
				width: toastWidth,
			}}
			duration={Number.POSITIVE_INFINITY}
			enableStacking
			visibleToasts={3}
			closeButton={false}
			swipeToDismissDirection="left"
			theme={theme.mode}
		/>
	);
};
