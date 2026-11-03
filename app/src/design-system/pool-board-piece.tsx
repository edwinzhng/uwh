import {
	type ReactElement,
	useCallback,
	useContext,
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
import { LiquidBubble, LiquidBubbleContext } from "./liquid-bubble-scene";
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
	onDrop?: (personId: string, x: number, y: number) => void;
	onManage?: () => void;
	acceptsDrop?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const liquid = useContext(LiquidBubbleContext);
	const suppressPress = useRef(false);
	const releaseFrame = useRef(0);
	useEffect(() => (): void => cancelAnimationFrame(releaseFrame.current), []);
	const moveLiquid = useCallback(
		(id: string, x: number, y: number, vx: number, vy: number): void =>
			liquid?.move(id, x, y, vx, vy),
		[liquid],
	);
	const refreshLiquid = useCallback((): void => {
		cancelAnimationFrame(releaseFrame.current);
		suppressPress.current = true;
		liquid?.refresh();
	}, [liquid]);
	const releaseLiquid = useCallback((): void => {
		liquid?.release();
		releaseFrame.current = requestAnimationFrame((): void => {
			suppressPress.current = false;
		});
	}, [liquid]);
	const latest = useRef({ spot, onDrop });
	latest.current = { spot, onDrop };
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const personId = spot.person?.id;
	const canDrag = Boolean(personId && onDrop);
	const drop = useCallback((id: string, left: number, top: number): void => {
		if (latest.current.spot.person?.id === id)
			latest.current.onDrop?.(id, left, top);
	}, []);
	const gesture = useMemo(
		() =>
			Gesture.Pan()
				.enabled(canDrag)
				.minDistance(6)
				.maxPointers(1)
				.onStart((event): void => {
					runOnJS(refreshLiquid)();
					if (personId)
						dragState.set({
							personId,
							scope,
							x: event.absoluteX,
							y: event.absoluteY,
						});
				})
				.onUpdate((event): void => {
					if (personId)
						runOnJS(moveLiquid)(
							personId,
							event.translationX,
							event.translationY,
							event.velocityX,
							event.velocityY,
						);
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
				.onFinalize((): void => {
					x.set(0);
					y.set(0);
					dragState.set(undefined);
					runOnJS(releaseLiquid)();
				}),
		[
			canDrag,
			personId,
			scope,
			drop,
			dragState,
			x,
			y,
			moveLiquid,
			refreshLiquid,
			releaseLiquid,
		],
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
				focusable={!spot.person && Boolean(onPress)}
				accessibilityRole={spot.person ? "image" : onPress ? "button" : "text"}
				accessibilityLabel={`${spot.label}${spot.person ? ` · ${spot.person.name}${spot.person.captain ? " · Captain" : ""}` : " · Add player"}`}
				accessibilityState={!spot.person && onPress ? { selected } : undefined}
				disabled={!onPress && !canDrag}
				onPress={(): void => {
					if (!spot.person && !suppressPress.current) onPress?.();
				}}
				style={{
					width: geometry.touch,
					height: geometry.touch,
					borderRadius: geometry.touch / 2,
					borderWidth: selected
						? geometry.focus
						: spot.person
							? 0
							: geometry.border,
					borderStyle: spot.person ? "solid" : "dashed",
					borderColor: selected ? theme.focus : theme.border,
					backgroundColor: selected ? theme.background.selected : "transparent",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{spot.person ? (
					<Avatar compact name={spot.person.name} personId={spot.person.id} />
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
				{spot.person?.captain ? (
					<Text
						pointerEvents="none"
						style={{
							position: "absolute",
							bottom: -space.xxs,
							right: -space.xxs,
							...typography.caption,
							fontFamily: font.semibold,
							color: theme.text.primary,
							backgroundColor: theme.background.selected,
							borderRadius: corners.pill,
							borderWidth: geometry.border,
							borderColor: theme.border,
							paddingHorizontal: space.xxs,
						}}
					>
						C
					</Text>
				) : undefined}
			</Pressable>
		</GestureDetector>
	);
	return (
		<Animated.View
			collapsable={false}
			style={[
				{
					flex: acceptsDrop ? 1 : undefined,
					width: acceptsDrop ? undefined : geometry.touch,
					minWidth: geometry.touch,
					paddingHorizontal: 0,
					alignItems: "center",
					gap: space.xs,
					borderRadius: corners.item,
				},
				slotStyle,
			]}
		>
			{acceptsDrop ? (
				<Text
					numberOfLines={2}
					style={{
						...typography.caption,
						fontFamily: font.medium,
						color: theme.text.secondary,
						textAlign: "center",
					}}
				>
					{spot.label}
				</Text>
			) : undefined}
			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "center",
					alignItems: "flex-start",
					gap: space.xxs,
					maxWidth: "100%",
				}}
			>
				<Animated.View
					style={[
						{
							alignItems: "center",
							gap: space.xxs,
							width: geometry.touch,
						},
						chipStyle,
					]}
				>
					{spot.person ? (
						<PoolDropTarget
							slotId={positionId}
							personId={spot.person.id}
							scope={scope}
							drag={dragState}
						>
							<LiquidBubble
								id={spot.person.id}
								size={geometry.touch}
								overlay={
									<Avatar
										compact
										name={spot.person.name}
										personId={spot.person.id}
									/>
								}
							>
								{trigger}
							</LiquidBubble>
						</PoolDropTarget>
					) : (
						<PoolDropTarget slotId={positionId} scope={scope} drag={dragState}>
							<PoolAddButton
								label={`Add player to ${spot.label}`}
								onPress={onPress}
							/>
						</PoolDropTarget>
					)}
					{spot.person ? (
						<Text
							pointerEvents="none"
							numberOfLines={2}
							style={{
								...typography.navigation,
								fontFamily: font.medium,
								color: theme.text.primary,
								textAlign: "center",
								width: "100%",
							}}
						>
							{spot.person.name}
						</Text>
					) : undefined}
				</Animated.View>
				{spot.substitutes?.map((person) => (
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
				{spot.person && acceptsDrop ? (
					<PoolDropTarget slotId={positionId} scope={scope} drag={dragState}>
						<PoolAddButton
							label={`Add player to ${spot.label}`}
							onPress={onManage}
						/>
					</PoolDropTarget>
				) : undefined}
			</View>
		</Animated.View>
	);
};
