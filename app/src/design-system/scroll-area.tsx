import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { type ScrollViewProps, View } from "react-native";
import Animated, {
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useTheme } from "./theme";
import { space } from "./tokens";

type Props = Omit<ScrollViewProps, "onScroll"> & {
	fadeTone?: "primary" | "secondary";
};

export const ScrollArea = ({
	children,
	style,
	onLayout,
	onContentSizeChange,
	fadeTone = "primary",
	horizontal = false,
	...props
}: Props): ReactElement => {
	const theme = useTheme();
	const offset = useSharedValue(0);
	const viewport = useSharedValue(0);
	const content = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((event) => {
		offset.set(horizontal ? event.contentOffset.x : event.contentOffset.y);
		viewport.set(
			horizontal
				? event.layoutMeasurement.width
				: event.layoutMeasurement.height,
		);
		content.set(
			horizontal ? event.contentSize.width : event.contentSize.height,
		);
	});
	const left = useAnimatedStyle(() => ({
		opacity:
			content.get() > viewport.get() + 1
				? Math.min(1, Math.max(0, offset.get()) / space.lg)
				: 0,
	}));
	const right = useAnimatedStyle(() => ({
		opacity:
			viewport.get() > 0 && content.get() > viewport.get() + 1
				? Math.min(
						1,
						Math.max(0, content.get() - viewport.get() - offset.get() - 1) /
							space.lg,
					)
				: 0,
	}));
	const color = theme.background[fadeTone];
	const clearColor = `${color}00`;
	const softColor = `${color}40`;
	return (
		<View
			style={[
				{ minWidth: 0, minHeight: 0, flexShrink: 1, overflow: "hidden" },
				style,
			]}
		>
			<Animated.ScrollView
				{...props}
				horizontal={horizontal}
				style={{ flexGrow: 0, flexShrink: 1, minHeight: 0, maxWidth: "100%" }}
				onScroll={onScroll}
				scrollEventThrottle={16}
				onLayout={(event): void => {
					viewport.set(
						horizontal
							? event.nativeEvent.layout.width
							: event.nativeEvent.layout.height,
					);
					onLayout?.(event);
				}}
				onContentSizeChange={(width, height): void => {
					content.set(horizontal ? width : height);
					onContentSizeChange?.(width, height);
				}}
			>
				{children}
			</Animated.ScrollView>
			<Animated.View
				pointerEvents="none"
				accessible={false}
				style={[
					{ position: "absolute", left: 0, top: 0 },
					horizontal
						? { bottom: 0, width: space.md }
						: { right: 0, height: space.md },
					left,
				]}
			>
				<LinearGradient
					colors={[color, softColor, clearColor]}
					locations={[0, 0.5, 1]}
					start={{ x: 0, y: 0 }}
					end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
					style={{ flex: 1 }}
				/>
			</Animated.View>
			<Animated.View
				pointerEvents="none"
				accessible={false}
				style={[
					{ position: "absolute", right: 0, bottom: 0 },
					horizontal
						? { top: 0, width: space.md }
						: { left: 0, height: space.md },
					right,
				]}
			>
				<LinearGradient
					colors={[clearColor, softColor, color]}
					locations={[0, 0.5, 1]}
					start={{ x: 0, y: 0 }}
					end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
					style={{ flex: 1 }}
				/>
			</Animated.View>
		</View>
	);
};
