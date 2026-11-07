import {
	type ReactElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ActionMenu } from "./action-menu";
import { LineupPlayerPortrait } from "./lineup-player-portrait";
import { LineupScrollContext } from "./lineup-scroll-context";
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
	const { width } = useWindowDimensions();
	const portraitSize = width >= geometry.wide ? 72 : width >= 600 ? 57 : 51;
	const scroll = useContext(LineupScrollContext);
	const setDragging = scroll?.setDragging;
	const suppressPress = useRef(false);
	const releaseFrame = useRef(0);
	useEffect(() => (): void => cancelAnimationFrame(releaseFrame.current), []);
	const beginDrag = useCallback((): void => {
		cancelAnimationFrame(releaseFrame.current);
		suppressPress.current = true;
		setDragging?.(true);
	}, [setDragging]);
	const endDrag = useCallback((): void => {
		setDragging?.(false);
		releaseFrame.current = requestAnimationFrame((): void => {
			suppressPress.current = false;
		});
	}, [setDragging]);
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
	const gesture = useMemo(() => {
		const pan = Gesture.Pan()
			.enabled(canDrag)
			.minDistance(6)
			.maxPointers(1)
			.onStart((event): void => {
				scheduleOnRN(beginDrag);
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
					scheduleOnRN(drop, personId, event.absoluteX, event.absoluteY);
			})
			.onFinalize((_event, success): void => {
				if (!success) scheduleOnRN(resetDrag);
			});
		return scroll ? pan.blocksExternalGesture(scroll.gesture) : pan;
	}, [
		canDrag,
		personId,
		scope,
		drop,
		dragState,
		x,
		y,
		beginDrag,
		resetDrag,
		scroll,
	]);
	const chipStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }, { translateY: y.get() }],
	}));
	const slotStyle = useAnimatedStyle(() => ({
		zIndex: personId && dragState.get()?.personId === personId ? 2 : 1,
	}));
	const trigger = (
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
				width: portraitSize,
				height: portraitSize,
				borderRadius: portraitSize / 2,
				borderWidth: selected ? geometry.focus : 0,
				borderStyle: spot.person ? "solid" : "dashed",
				borderColor: selected ? theme.focus : theme.controlBorder,
				backgroundColor: selected ? theme.background.selected : "transparent",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{spot.person ? (
				<LineupPlayerPortrait
					name={spot.person.name}
					personId={spot.person.id}
					displayName={spot.person.displayName}
					substitute={spot.person.substitute}
					diameter={portraitSize}
					field
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
						paddingVertical: space.xs,
						borderRadius: corners.panel,
						borderWidth: geometry.border,
						borderColor: theme.border,
						backgroundColor: `${theme.background.card}99`,
						gap: space.xxs,
					},
					slotStyle,
				]}
			>
				<PoolDropTarget slotId={positionId} scope={scope} drag={dragState} />
				{spot.addOptions || onManage || onPress ? (
					<View
						style={{
							position: "absolute",
							top: space.xs,
							right: space.xs,
							zIndex: 1,
						}}
					>
						<View
							style={{
								width: geometry.touch,
								height: geometry.touch,
								alignItems: "flex-end",
							}}
						>
							{spot.addOptions && !onPress ? (
								<ActionMenu
									add
									label={`Add player to ${spot.label}`}
									groups={[
										{
											id: "players",
											items: spot.addOptions.length
												? spot.addOptions
												: [
														{
															id: "empty",
															label: "All players selected",
															isDisabled: true,
															onSelect: (): void => {},
														},
													],
										},
									]}
								/>
							) : (
								<PoolAddButton
									label={`Add player to ${spot.label}`}
									onPress={onManage ?? onPress}
								/>
							)}
						</View>
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
						alignItems: "center",
						justifyContent: "center",
						gap: space.xxs,
						maxWidth: "100%",
					}}
				>
					{[
						...(spot.person ? [spot.person] : []),
						...(spot.substitutes ?? []),
					].map((person, index) => (
						<PoolPiece
							key={person.id}
							spot={{
								id: person.id,
								label: spot.label,
								person: {
									...person,
									substitute: Boolean(spot.person) && index > 0,
								},
							}}
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
		<GestureDetector gesture={gesture} touchAction={canDrag ? "none" : "auto"}>
			<Animated.View
				collapsable={false}
				style={[
					{
						width: portraitSize + space.xxs * 2,
						padding: space.xxs,
						borderWidth: 0,
						borderColor: "transparent",
						borderRadius: corners.control,
						backgroundColor: "transparent",
						alignItems: "center",
						gap: 0,
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
				/>
				{trigger}
			</Animated.View>
		</GestureDetector>
	);
};
