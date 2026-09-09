import {
	type ReactElement,
	type ReactNode,
	startTransition,
	useEffect,
	useRef,
	useState,
} from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassPanel } from "./glass-panel";
import { materialColors } from "./materials";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { SegmentIndicator } from "./segment-indicator";
import { useTheme } from "./theme";
import { corners, geometry, layer, space } from "./tokens";
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
	const navigationFrame = useRef<number>(undefined);
	useEffect(() => {
		setPendingSelection((current) =>
			current?.routeKey === routeKey ? current : undefined,
		);
		return (): void => {
			if (navigationFrame.current !== undefined)
				cancelAnimationFrame(navigationFrame.current);
		};
	}, [routeKey]);
	const selected = navigation.findIndex((item) =>
		pendingSelection?.routeKey === routeKey
			? item.label === pendingSelection.label
			: item.selected,
	);
	const itemWidth = barSize.width / navigation.length;
	const selectTab = (item: NavigationItem): void => {
		if (navigationFrame.current !== undefined)
			cancelAnimationFrame(navigationFrame.current);
		setHovered(undefined);
		setPendingSelection({ routeKey, label: item.label });
		const navigate = (): void => {
			navigationFrame.current = undefined;
			startTransition(item.onPress);
		};
		if (!canAnimate) {
			navigate();
			return;
		}
		navigationFrame.current = requestAnimationFrame((): void => {
			navigationFrame.current = requestAnimationFrame(navigate);
		});
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
					<GlassPanel shape="pill" material="floating" padding="xxs">
						<View
							accessibilityRole="tablist"
							accessibilityLabel="Main navigation"
							onLayout={(event): void => {
								const { width, height } = event.nativeEvent.layout;
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
										borderRadius: corners.pill,
										backgroundColor: colors.hover,
										zIndex: layer.base,
									}}
								/>
							) : undefined}
							{barSize.width > 0 && selected >= 0 ? (
								<SegmentIndicator
									frame={{
										x: selected * itemWidth + space.xxs,
										y: space.xxs,
										width: itemWidth - space.xxs * 2,
										height: barSize.height - space.xxs * 2,
									}}
									isRound
									appearance="glass"
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
											onPress: (): void => selectTab(item),
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
