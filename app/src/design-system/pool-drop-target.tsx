import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useEffect,
} from "react";
import { Text, View } from "react-native";
import Animated, {
	measure,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import type { PoolBoardDrag, PoolDropFrame } from "./pool-board-layout";
import { poolBoardDropHighlighted } from "./pool-board-layout";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export type PoolTarget = {
	slotId: string;
	personId?: string;
	bounds: () => Promise<PoolDropFrame | undefined>;
};
export const PoolTargetsContext = createContext<
	((id: string, target: PoolTarget) => () => void) | undefined
>(undefined);
export const PoolDropTarget = ({
	slotId,
	personId,
	scope,
	drag,
	children,
	contentAlignment = "start",
	size = geometry.touch,
}: {
	slotId: string;
	personId?: string;
	scope: string;
	drag: SharedValue<PoolBoardDrag | undefined>;
	children: ReactNode;
	contentAlignment?: "start" | "end";
	size?: number;
}): ReactElement => {
	const register = useContext(PoolTargetsContext);
	const target = useAnimatedRef<View>();
	const frame = useSharedValue<PoolDropFrame | undefined>(undefined);
	const theme = useTheme();
	useEffect(
		() =>
			register?.(`${personId ?? `add:${slotId}`}`, {
				slotId,
				personId,
				bounds: (): Promise<PoolDropFrame | undefined> =>
					new Promise((resolve) => {
						if (!target.current) resolve(undefined);
						else
							target.current.measureInWindow((x, y, width, height): void =>
								resolve({ x, y, width, height }),
							);
					}),
			}),
		[register, slotId, personId, target],
	);
	useAnimatedReaction(
		() => drag.get()?.personId,
		(id, old): void => {
			if (id && id !== old) {
				const value = measure(target);
				frame.set(
					value
						? {
								x: value.pageX,
								y: value.pageY,
								width: value.width,
								height: value.height,
							}
						: undefined,
				);
			} else if (!id) frame.set(undefined);
		},
	);
	const style = useAnimatedStyle(() => ({
		opacity: poolBoardDropHighlighted(drag.get(), frame.get(), scope, personId)
			? 1
			: 0,
	}));
	return (
		<View
			ref={target}
			collapsable={false}
			style={{
				position: "relative",
				width: size,
				height: size,
				alignItems: contentAlignment === "end" ? "flex-end" : "flex-start",
			}}
		>
			{children}
			<Animated.View
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				aria-hidden
				pointerEvents="none"
				style={[
					{
						position: "absolute",
						inset: 0,
						borderWidth: geometry.focus,
						borderStyle: personId ? "solid" : "dotted",
						borderRadius: corners.pill,
						borderColor: theme.focus,
					},
					style,
				]}
			/>
			<Animated.View
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				aria-hidden
				pointerEvents="none"
				style={[
					{
						position: "absolute",
						bottom: "100%",
						marginBottom: space.xxs,
						alignSelf: "center",
						paddingHorizontal: space.xs,
						borderRadius: corners.item,
						backgroundColor: theme.brand.background,
						zIndex: 10,
					},
					style,
				]}
			>
				<Text
					style={{
						...typography.caption,
						fontFamily: font.semibold,
						color: theme.brand.foreground,
					}}
				>
					{personId ? "Swap" : "Move"}
				</Text>
			</Animated.View>
		</View>
	);
};
