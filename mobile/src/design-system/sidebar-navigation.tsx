import { type ReactElement, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GlassPanel } from "./glass-panel";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { type SegmentFrame, SegmentIndicator } from "./segment-indicator";
import { layer, motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const SidebarNavigation = ({
	navigation,
}: {
	navigation: NavigationItem[];
}): ReactElement => {
	const [frames, setFrames] = useState<Record<string, SegmentFrame>>({});
	const [pending, setPending] = useState<{
		from: string | undefined;
		label: string;
	}>();
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const canAnimate = useMotion();
	useEffect(() => (): void => clearTimeout(timer.current), []);
	const activeLabel = navigation.find((item) => item.selected)?.label;
	const selected =
		pending && pending.from === activeLabel ? pending.label : activeLabel;
	const frame = selected ? frames[selected] : undefined;
	const select = (item: NavigationItem): void => {
		clearTimeout(timer.current);
		setPending({ from: activeLabel, label: item.label });
		if (!canAnimate || item.selected) {
			item.onPress();
			return;
		}
		timer.current = setTimeout(item.onPress, motion.duration.standard);
	};
	return (
		<GlassPanel padding="xs">
			<View
				accessibilityRole="tablist"
				accessibilityLabel="Main navigation"
				style={{ gap: space.xxs }}
			>
				{frame ? (
					<SegmentIndicator frame={frame} appearance="glass" />
				) : undefined}
				{navigation.map((item) => (
					<View
						key={item.label}
						onLayout={({ nativeEvent }): void => {
							const { x, y, width, height } = nativeEvent.layout;
							setFrames((current) =>
								current[item.label]?.x === x &&
								current[item.label]?.y === y &&
								current[item.label]?.width === width &&
								current[item.label]?.height === height
									? current
									: { ...current, [item.label]: { x, y, width, height } },
							);
						}}
						style={{ zIndex: layer.selected }}
					>
						<NavigationControl
							glass
							item={{
								...item,
								selected: item.label === selected,
								onPress: (): void => select(item),
							}}
						/>
					</View>
				))}
			</View>
		</GlassPanel>
	);
};
