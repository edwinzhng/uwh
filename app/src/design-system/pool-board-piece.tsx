import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { Avatar } from "./avatar";
import { PoolAddButton } from "./pool-add-button";
import type { PoolBoardSpot } from "./pool-board";
import type { PoolBoardDrag } from "./pool-board-layout";
import { PoolDropTarget } from "./pool-drop-target";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const PoolPiece = ({
	spot,
	selected,
	selectedPersonId,
	dragState,
	scope,
	positionId = spot.id,
	onPress,
	onDrop,
	onManage,
	acceptsDrop = true,
}: {
	spot: PoolBoardSpot;
	selected: boolean;
	selectedPersonId?: string;
	dragState: SharedValue<PoolBoardDrag | undefined>;
	scope: string;
	positionId?: string;
	onPress?: () => void;
	onDrop?: (personId: string, x: number, y: number) => Promise<void>;
	onManage?: () => void;
	acceptsDrop?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const suppressPress = useRef(false);
	const releaseFrame = useRef(0);
	useEffect(() => (): void => cancelAnimationFrame(releaseFrame.current), []);
	const beginDrag = useCallback((): void => {
		cancelAnimationFrame(releaseFrame.current);
		suppressPress.current = true;
	}, []);
	const endDrag = useCallback((): void => {
		releaseFrame.current = requestAnimationFrame((): void => {
			suppressPress.current = false;
		});
	}, []);
	const latest = useRef({ spot, onDrop });
	latest.current = { spot, onDrop };
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const personId = spot.person?.id;
	const canDrag = Boolean(personId && onDrop);
	const resetDrag = useCallback((): void => {
		x.set(0);
		y.set(0);
		dragState.set(undefined);
		endDrag();
	}, [x, y, dragState, endDrag]);
	const drop = useCallback(
		async (id: string, left: number, top: number): Promise<void> => {
			try {
				if (latest.current.spot.person?.id === id)
					await latest.current.onDrop?.(id, left, top);
			} finally {
				releaseFrame.current = requestAnimationFrame(resetDrag);
			}
		},
		[resetDrag],
	);
	const gesture = useMemo(
		() =>
			Gesture.Pan()
				.enabled(canDrag)
				.minDistance(6)
				.maxPointers(1)
				.onStart((event): void => {
					runOnJS(beginDrag)();
					if (personId)
						dragState.set({
							personId,
							scope,
							x: event.absoluteX,
							y: event.absoluteY,
						});
				})
				.onUpdate((event): void => {
					x.set(event.translationX);
					y.set(event.translationY);
					if (personId)
						dragState.set({
							personId,
							scope,
							x: event.absoluteX,
							y: event.absoluteY,
						});
				})
				.onEnd((event): void => {
					if (personId)
						runOnJS(drop)(personId, event.absoluteX, event.absoluteY);
				})
				.onFinalize((_event, success): void => {
					if (!success) runOnJS(resetDrag)();
				}),
		[canDrag, personId, scope, drop, dragState, x, y, beginDrag, resetDrag],
	);
	const chipStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }, { translateY: y.get() }],
	}));
	const slotStyle = useAnimatedStyle(() => ({
		zIndex: personId && dragState.get()?.personId === personId ? 2 : 1,
	}));
	const trigger = (
		<GestureDetector gesture={gesture} touchAction={canDrag ? "none" : "auto"}>
			<Pressable
				collapsable={false}
				hitSlop={space.xs}
				focusable={!spot.person && Boolean(onPress)}
				accessibilityRole={spot.person ? "image" : onPress ? "button" : "text"}
				accessibilityLabel={`${spot.label}${spot.person ? ` · ${spot.person.name}${spot.person.captain ? " · Captain" : ""}` : " · Add player"}`}
				accessibilityState={!spot.person && onPress ? { selected } : undefined}
				disabled={!onPress && !canDrag}
				onPress={(): void => {
					if (!spot.person && !suppressPress.current) onPress?.();
				}}
				style={{
					width: geometry.compactAvatar + space.xxs * 2,
					height: geometry.compactAvatar + space.xxs * 2,
					borderRadius: geometry.touch / 2,
					borderWidth: selected ? geometry.focus : 0,
					borderStyle: spot.person ? "solid" : "dashed",
					borderColor: selected ? theme.focus : theme.controlBorder,
					backgroundColor: selected ? theme.background.selected : "transparent",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{spot.person ? (
					<Avatar
						bright
						compact
						name={spot.person.name}
						personId={spot.person.id}
					/>
				) : (
					<Text
						style={{
							...typography.small,
							fontFamily: font.semibold,
							color: theme.text.primary,
						}}
					>
						+
					</Text>
				)}
			</Pressable>
		</GestureDetector>
	);
	if (acceptsDrop)
		return (
			<Animated.View
				style={[
					{
						flex: 1,
						minWidth: 0,
						alignItems: "center",
						justifyContent: "center",
						paddingVertical: space.xxs,
						borderRadius: corners.panel,
						borderWidth: geometry.border,
						borderColor: theme.border,
						backgroundColor: `${theme.background.card}99`,
						gap: space.xxs,
					},
					slotStyle,
				]}
			>
				{onManage || onPress ? (
					<View
						style={{
							position: "absolute",
							top: space.xs,
							right: space.xs,
							zIndex: 1,
						}}
					>
						<PoolDropTarget slotId={positionId} scope={scope} drag={dragState}>
							<PoolAddButton
								label={`Add player to ${spot.label}`}
								onPress={onManage ?? onPress}
							/>
						</PoolDropTarget>
					</View>
				) : undefined}
				<View
					style={{
						paddingHorizontal: geometry.icon + space.xs,
						alignItems: "center",
					}}
				>
					<Text
						style={{
							...typography.navigation,
							fontFamily: font.semibold,
							color: theme.text.primary,
						}}
					>
						{spot.shortLabel ?? spot.label}
					</Text>
				</View>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: space.xxs,
						maxWidth: "100%",
					}}
				>
					{[
						...(spot.person ? [spot.person] : []),
						...(spot.substitutes ?? []),
					].map((person) => (
						<PoolPiece
							key={person.id}
							spot={{ id: person.id, label: spot.label, person }}
							selected={selectedPersonId === person.id}
							selectedPersonId={selectedPersonId}
							dragState={dragState}
							scope={scope}
							onDrop={onDrop}
							acceptsDrop={false}
							positionId={positionId}
						/>
					))}
				</View>
			</Animated.View>
		);
	return (
		<Animated.View
			collapsable={false}
			style={[
				{
					width: geometry.touch + space.sm,
					alignItems: "center",
					gap: space.xxs,
				},
				slotStyle,
				chipStyle,
			]}
		>
			<PoolDropTarget
				slotId={positionId}
				personId={spot.person?.id}
				scope={scope}
				drag={dragState}
			>
				{trigger}
			</PoolDropTarget>
			<Text
				pointerEvents="none"
				numberOfLines={2}
				style={{
					...typography.navigation,
					fontFamily: font.regular,
					color: theme.text.primary,
					textAlign: "center",
					width: "100%",
					height: typography.navigation.lineHeight * 2,
				}}
			>
				{spot.person?.displayName ?? spot.person?.name}
			</Text>
		</Animated.View>
	);
};
