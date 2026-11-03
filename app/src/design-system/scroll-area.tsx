import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, type Ref, useImperativeHandle } from "react";
import {
	Platform,
	type ScrollView,
	type ScrollViewProps,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedRef,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { PaginationViewport } from "./pagination-viewport";
import type { ScrollRevealIntent } from "./scroll-reveal";
import type { ScrollRange } from "./scroll-visibility";
import { useTheme } from "./theme";
import { space } from "./tokens";
import { useScrollReveal } from "./use-scroll-reveal";

type Props = Omit<ScrollViewProps, "onScroll"> & {
	fadeTone?: "primary" | "secondary";
	revealRef?: Ref<ScrollAreaHandle>;
};

export type ScrollAreaHandle = {
	reveal: (range: ScrollRange, intent?: ScrollRevealIntent) => void;
};

export const ScrollArea = ({
	children,
	style,
	onLayout,
	onContentSizeChange,
	onTouchStart,
	revealRef,
	fadeTone = "primary",
	horizontal = false,
	...props
}: Props): ReactElement => {
	const theme = useTheme();
	const scroll = useAnimatedRef<ScrollView>();
	const offset = useSharedValue(0);
	const viewport = useSharedValue(0);
	const content = useSharedValue(0);
	const { reveal, interrupt, onScroll } = useScrollReveal({
		scroll,
		enabled: revealRef !== undefined && revealRef !== null,
		horizontal: horizontal === true,
		offset,
		viewport,
		content,
	});
	useImperativeHandle(revealRef, (): ScrollAreaHandle => ({ reveal }), [
		reveal,
	]);
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
	const scrollStyle: ViewStyle & { overscrollBehavior?: "contain" } = {
		flexGrow: 0,
		flexShrink: 1,
		minHeight: 0,
		maxWidth: "100%",
		overscrollBehavior: Platform.OS === "web" ? "contain" : undefined,
	};
	return (
		<PaginationViewport.Provider value={scroll}>
			<View
				style={[
					{ minWidth: 0, minHeight: 0, flexShrink: 1, overflow: "hidden" },
					style,
				]}
			>
				<Animated.ScrollView
					ref={scroll}
					{...props}
					horizontal={horizontal}
					style={scrollStyle}
					onScroll={onScroll}
					onTouchStart={(event): void => {
						if (revealRef !== undefined && revealRef !== null) interrupt();
						onTouchStart?.(event);
					}}
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
		</PaginationViewport.Provider>
	);
};
