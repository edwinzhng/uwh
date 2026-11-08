import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
} from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { HomeCardEditPreview } from "./home-card-edit-preview";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Text } from "./text";
import { geometry, space } from "./tokens";

export const HomeCardFrame = ({
	label,
	editing,
	busy,
	canMoveUp,
	canMoveDown,
	onEdit,
	onRemove,
	onMove,
	onDragEnd,
	onHeight,
	children,
}: {
	label: string;
	editing: boolean;
	busy: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onEdit: () => void;
	onRemove: () => void;
	onMove: (direction: -1 | 1) => void;
	onDragEnd: (distance: number) => void;
	onHeight: (height: number) => void;
	children: ReactNode;
}): ReactElement => {
	const offset = useSharedValue(0);
	const dragging = useSharedValue(false);
	const reducedMotion = useReducedMotion();
	const enabled = editing && !busy && (canMoveUp || canMoveDown);
	const latest = useRef({ enabled, onDragEnd });
	latest.current = { enabled, onDragEnd };
	const finishDrag = useCallback((distance: number): void => {
		if (latest.current.enabled) latest.current.onDragEnd(distance);
	}, []);
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.enabled(enabled)
				.maxPointers(1)
				.activeOffsetY([-8, 8])
				.activeCursor("grabbing")
				.onStart((): void => dragging.set(true))
				.onUpdate((event): void => offset.set(event.translationY))
				.onEnd((event, success): void => {
					if (success) scheduleOnRN(finishDrag, event.translationY);
				})
				.onFinalize((): void => {
					offset.set(0);
					dragging.set(false);
				}),
		[enabled, offset, dragging, finishDrag],
	);
	const dragStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: reducedMotion ? 0 : offset.get() }],
		zIndex: dragging.get() ? 10 : 0,
		paddingBottom: space.sm,
	}));
	return (
		<Animated.View
			onLayout={(event): void => onHeight(event.nativeEvent.layout.height)}
			style={dragStyle}
		>
			{editing ? (
				<>
					<View
						style={{ paddingHorizontal: space.xs, paddingBottom: space.xxs }}
					>
						<Row justify="between" gap="xs">
							<IconButton
								label={`Remove ${label}`}
								icon="minus"
								isDisabled={busy}
								onPress={onRemove}
							/>
							<Text variant="small" tone="secondary">
								{label}
							</Text>
							<Row gap="none">
								<IconButton
									label={`Move ${label} up`}
									icon="arrowUp"
									isDisabled={busy || !canMoveUp}
									onPress={(): void => onMove(-1)}
								/>
								<IconButton
									label={`Move ${label} down`}
									icon="arrowDown"
									isDisabled={busy || !canMoveDown}
									onPress={(): void => onMove(1)}
								/>
								<GestureDetector gesture={pan}>
									<View
										collapsable={false}
										aria-hidden
										style={{
											width: geometry.touch,
											height: geometry.touch,
											alignItems: "center",
											justifyContent: "center",
											cursor: enabled ? "pointer" : "auto",
										}}
									>
										<Icon name="menu" tone="secondary" />
									</View>
								</GestureDetector>
							</Row>
						</Row>
					</View>
					<HomeCardEditPreview>{children}</HomeCardEditPreview>
				</>
			) : (
				<Pressable onLongPress={onEdit} delayLongPress={550}>
					{children}
				</Pressable>
			)}
		</Animated.View>
	);
};
