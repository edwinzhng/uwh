import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassPanel } from "./glass-panel";
import { HoverSurface } from "./hover-surface";
import { nativeTabsAvailable } from "./native-navigation";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { NavigationIndicator } from "./navigation-indicator";
import {
	navigationGeometry,
	navigationSelection,
	type PendingNavigation,
	phoneNavigationItems,
} from "./navigation-model";
import { geometry, layer, space } from "./tokens";
import { useKeyboardVisible } from "./use-keyboard-visible";

export const NavigationFrame = ({
	children,
	navigation,
	routeKey,
	hidden = false,
}: {
	children: ReactNode;
	navigation: NavigationItem[];
	routeKey: string;
	hidden?: boolean;
}): ReactElement => {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const keyboard = useKeyboardVisible();
	const [barSize, setBarSize] = useState({ width: 0, height: 0 });
	const [pendingSelection, setPendingSelection] = useState<PendingNavigation>();
	const phoneNavigation = phoneNavigationItems(navigation);
	const selected = navigationSelection(
		phoneNavigation,
		routeKey,
		pendingSelection,
	);
	const indicator = navigationGeometry(
		barSize.width,
		phoneNavigation.length,
		selected,
	);
	useEffect((): void => {
		setPendingSelection((current) =>
			current?.routeKey === routeKey ? current : undefined,
		);
	}, [routeKey]);
	const selectTab = (item: NavigationItem): void => {
		setPendingSelection({ routeKey, label: item.label });
		item.onPress();
	};
	return (
		<View style={{ flex: 1 }}>
			{children}
			{!nativeTabsAvailable() &&
			!hidden &&
			!keyboard &&
			width < geometry.wide ? (
				<View
					style={{
						position: "absolute",
						left: space.sm + insets.left,
						right: space.sm + insets.right,
						bottom: Math.max(space.xs, insets.bottom),
						zIndex: layer.sticky,
					}}
				>
					<GlassPanel padding="xxs" shape="pill" interactive>
						<HoverSurface selector='[role="tab"]'>
							<View
								accessibilityRole="tablist"
								accessibilityLabel="Main navigation"
								onLayout={(event): void => {
									const { width, height } = event.nativeEvent.layout;
									setBarSize({ width, height });
								}}
								style={{ flexDirection: "row" }}
							>
								{indicator ? (
									<NavigationIndicator
										frame={indicator}
										height={barSize.height}
										value={String(selected)}
									/>
								) : undefined}
								{phoneNavigation.map((item, index) => (
									<View
										key={item.label}
										style={{ flex: 1, minWidth: 0, zIndex: layer.selected }}
									>
										<NavigationControl
											sharedHover
											item={{
												...item,
												selected: index === selected,
												onPress: (): void => selectTab(item),
											}}
											vertical
											glass
										/>
									</View>
								))}
							</View>
						</HoverSurface>
					</GlassPanel>
				</View>
			) : undefined}
		</View>
	);
};
