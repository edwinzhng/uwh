import type { ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import { Toaster } from "sonner";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";
export const ActionToaster = (): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const wide = width >= geometry.wide;
	const offset = {
		left: `calc(env(safe-area-inset-left, 0px) + ${space.md}px)`,
		right: `calc(env(safe-area-inset-right, 0px) + ${space.md}px)`,
		bottom: `calc(env(safe-area-inset-bottom, 0px) + ${space.md}px)`,
	};
	return (
		<Toaster
			position={wide ? "bottom-right" : "bottom-center"}
			offset={offset}
			mobileOffset={offset}
			duration={Number.POSITIVE_INFINITY}
			visibleToasts={3}
			closeButton={false}
			swipeDirections={["left", "right", "bottom"]}
			theme={theme.mode}
			style={{
				left: wide ? "auto" : "50%",
				right: wide ? offset.right : "auto",
				transform: wide ? "none" : "translateX(-50%)",
				width: `min(356px, calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - ${space.md * 2}px))`,
			}}
			toastOptions={{ style: { width: "100%" } }}
		/>
	);
};
