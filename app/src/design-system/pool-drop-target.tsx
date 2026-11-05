import { createContext, type ReactElement, useContext, useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
	measure,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { PoolBoardContext } from "./pool-board-context";
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
}: {
	slotId: string;
	personId?: string;
	scope: string;
	drag: SharedValue<PoolBoardDrag | undefined>;
}): ReactElement => {
	const register = useContext(PoolTargetsContext);
	const target = useAnimatedRef<View>();
	const frame = useSharedValue<PoolDropFrame | undefined>(undefined);
	const theme = useTheme();
	const boards = useContext(PoolBoardContext);
	const localHovered = useSharedValue<string | undefined>(undefined);
	const hoveredPersonId = boards?.hoveredPersonId ?? localHovered;
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
	useAnimatedReaction(
		() => poolBoardDropHighlighted(drag.get(), frame.get(), scope, personId),
		(active): void => {
			if (!personId) return;
			if (active) hoveredPersonId.set(personId);
			else if (hoveredPersonId.get() === personId)
				hoveredPersonId.set(undefined);
		},
	);
	const tooltipStyle = useAnimatedStyle(() => ({
		opacity:
			personId &&
			poolBoardDropHighlighted(drag.get(), frame.get(), scope, personId)
				? 1
				: 0,
	}));
	const style = useAnimatedStyle(() => ({
		opacity:
			poolBoardDropHighlighted(drag.get(), frame.get(), scope, personId) &&
			(personId || !hoveredPersonId.get())
				? 1
				: 0,
	}));

	return (
		<View
			ref={target}
			collapsable={false}
			pointerEvents="none"
			style={{ position: "absolute", inset: 0, zIndex: 2 }}
		>
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
						borderStyle: "solid",
						borderRadius: personId ? corners.control : corners.panel,
						borderColor: theme.focus,
						backgroundColor: `${theme.focus}12`,
					},
					style,
				]}
			/>
			{personId ? (
				<Animated.View
					pointerEvents="none"
					accessible={false}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					aria-hidden
					style={[
						{
							position: "absolute",
							bottom: "100%",
							marginBottom: space.xxs,
							alignSelf: "center",
							minWidth: geometry.touch + space.sm,
							paddingHorizontal: space.xs,
							borderRadius: corners.item,
							backgroundColor: theme.brand.background,
							zIndex: 10,
						},
						tooltipStyle,
					]}
				>
					<Text
						numberOfLines={1}
						style={{
							...typography.caption,
							fontFamily: font.semibold,
							color: theme.brand.foreground,
							textAlign: "center",
							flexShrink: 0,
						}}
					>
						Swap
					</Text>
				</Animated.View>
			) : undefined}
		</View>
	);
};
