import { motionEffects } from "@uwhclub/design-system/tokens";
import { type ReactElement, type ReactNode, useContext } from "react";
import { StyleSheet, View } from "react-native";
import { loadingColors } from "./loading-colors";
import { LoadingLayer } from "./loading-layer";
import { LoadingScreen } from "./loading-screen";
import { LoadingCoveredContext } from "./loading-state";
import { useLoadingHold } from "./use-loading-hold";

export const LoadingHandoff = ({
	loading,
	children,
	keepMounted = false,
	fillViewport = false,
}: {
	loading: boolean;
	children: ReactNode | (() => ReactNode);
	keepMounted?: boolean;
	fillViewport?: boolean;
}): ReactElement => {
	const covered = useContext(LoadingCoveredContext);
	const visible = useLoadingHold(
		loading && !covered,
		motionEffects.loadingMinimum,
	);
	return (
		<View collapsable={false} style={{ flex: 1, minHeight: 0 }}>
			<LoadingCoveredContext value={covered || visible}>
				{(!loading || keepMounted) &&
					(typeof children === "function" ? children() : children)}
			</LoadingCoveredContext>
			{!covered && visible ? (
				<LoadingLayer fillViewport={fillViewport}>
					<View
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: loadingColors.canvas, zIndex: 1 },
						]}
					>
						<LoadingScreen />
					</View>
				</LoadingLayer>
			) : undefined}
		</View>
	);
};
