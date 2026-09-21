import {
	type ReactElement,
	type ReactNode,
	startTransition,
	useCallback,
	useEffect,
	useState,
} from "react";
import { useWindowDimensions, View } from "react-native";
import {
	Easing,
	ReduceMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassPanel } from "./glass-panel";
import { materialColors } from "./materials";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { NavigationIndicator } from "./navigation-indicator";
import { useTheme } from "./theme";
import { corners, geometry, layer, motion, space } from "./tokens";
import { useKeyboardVisible } from "./use-keyboard-visible";
import { useMotion } from "./use-motion";

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
	const colors = materialColors(useTheme());
	const keyboard = useKeyboardVisible();
	const canAnimate = useMotion();
	const [barSize, setBarSize] = useState<{ width: number; height: number }>({
		width: 0,
		height: geometry.tab,
	});
	const [hovered, setHovered] = useState<number>();
	const [pendingSelection, setPendingSelection] = useState<{
		routeKey: string;
		label: string;
	}>();
	const selected = navigation.findIndex((item) =>
		pendingSelection?.routeKey === routeKey
			? item.label === pendingSelection.label
			: item.selected,
	);
	const indicatorPosition = useSharedValue(Math.max(0, selected));
	const indicatorItemWidth = useSharedValue(0);
	const indicatorBarHeight = useSharedValue<number>(geometry.tab);
	const moveIndicator = useCallback(
		(index: number): void => {
			indicatorPosition.set(
				withTiming(index, {
					duration: canAnimate
						? motion.duration.standard
						: motion.duration.instant,
					easing: Easing.bezier(...motion.easing.out),
					reduceMotion: ReduceMotion.System,
				}),
			);
		},
		[canAnimate, indicatorPosition],
	);
	useEffect((): void => {
		setPendingSelection((current) =>
			current?.routeKey === routeKey ? current : undefined,
		);
	}, [routeKey]);
	useEffect((): void => {
		if (selected >= 0) moveIndicator(selected);
	}, [moveIndicator, selected]);
	const itemWidth = barSize.width / navigation.length;
	const selectTab = (item: NavigationItem, index: number): void => {
		setHovered(undefined);
		setPendingSelection({ routeKey, label: item.label });
		moveIndicator(index);
		startTransition(item.onPress);
	};
	return (
		<View style={{ flex: 1 }}>
			{children}
			{!hidden && !keyboard && width < geometry.wide ? (
				<View
					style={{
						position: "absolute",
						left: space.sm,
						right: space.sm,
						bottom: Math.max(space.sm, insets.bottom),
						zIndex: layer.sticky,
					}}
				>
					<GlassPanel shape="panel" material="floating" padding="xxs">
						<View
							accessibilityRole="tablist"
							accessibilityLabel="Main navigation"
							onLayout={(event): void => {
								const { width, height } = event.nativeEvent.layout;
								indicatorItemWidth.set(width / navigation.length);
								indicatorBarHeight.set(height);
								setBarSize((current) =>
									current.width === width && current.height === height
										? current
										: { width, height },
								);
							}}
							style={{ flexDirection: "row" }}
						>
							{hovered !== undefined && hovered !== selected ? (
								<View
									pointerEvents="none"
									style={{
										position: "absolute",
										left: hovered * itemWidth + space.xxs,
										top: space.xxs,
										width: itemWidth - space.xxs * 2,
										height: barSize.height - space.xxs * 2,
										borderRadius: corners.panel,
										backgroundColor: colors.hover,
										zIndex: layer.base,
									}}
								/>
							) : undefined}
							{barSize.width > 0 && selected >= 0 ? (
								<NavigationIndicator
									position={indicatorPosition}
									itemWidth={indicatorItemWidth}
									barHeight={indicatorBarHeight}
								/>
							) : undefined}
							{navigation.map((item, index) => (
								<View
									key={item.label}
									style={{ flex: 1, minWidth: 0, zIndex: layer.selected }}
								>
									<NavigationControl
										item={{
											...item,
											selected: index === selected,
											onPress: (): void => selectTab(item, index),
										}}
										vertical
										onHoverChange={(value): void =>
											setHovered(value ? index : undefined)
										}
									/>
								</View>
							))}
						</View>
					</GlassPanel>
				</View>
			) : undefined}
		</View>
	);
};
