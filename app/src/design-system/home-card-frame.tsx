import {
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
	useState,
} from "react";
import { PanResponder, Pressable, View } from "react-native";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Text } from "./text";
import { corners, space } from "./tokens";

export type HomeCardFramePosition = { y: number; height: number };
export const HomeCardFrame = ({
	label,
	editing,
	canMoveUp,
	canMoveDown,
	onEdit,
	onRemove,
	onMove,
	onDragEnd,
	onPosition,
	children,
}: {
	label: string;
	editing: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onEdit: () => void;
	onRemove: () => void;
	onMove: (direction: -1 | 1) => void;
	onDragEnd: (distance: number) => void;
	onPosition: (position: HomeCardFramePosition) => void;
	children: ReactNode;
}): ReactElement => {
	const [translation, setTranslation] = useState(0);
	const callbacks = useRef({ onDragEnd });
	callbacks.current = { onDragEnd };
	const pan = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: () => true,
				onPanResponderMove: (_event, gesture) => setTranslation(gesture.dy),
				onPanResponderRelease: (_event, gesture) => {
					setTranslation(0);
					callbacks.current.onDragEnd(gesture.dy);
				},
				onPanResponderTerminate: () => setTranslation(0),
				onPanResponderTerminationRequest: () => false,
			}),
		[],
	);
	return (
		<View
			onLayout={(event): void =>
				onPosition({
					y: event.nativeEvent.layout.y,
					height: event.nativeEvent.layout.height,
				})
			}
			style={{
				transform: [{ translateY: translation }],
				zIndex: translation ? 10 : 0,
			}}
		>
			{editing ? (
				<View style={{ paddingHorizontal: space.xs, paddingBottom: space.xxs }}>
					<Row justify="between" gap="xs">
						<IconButton
							label={`Remove ${label}`}
							icon="minus"
							onPress={onRemove}
						/>
						<Text variant="small" tone="secondary">
							{label}
						</Text>
						<Row gap="none">
							<IconButton
								label={`Move ${label} up`}
								icon="arrowUp"
								isDisabled={!canMoveUp}
								onPress={(): void => onMove(-1)}
							/>
							<IconButton
								label={`Move ${label} down`}
								icon="arrowDown"
								isDisabled={!canMoveDown}
								onPress={(): void => onMove(1)}
							/>
							<View
								{...pan.panHandlers}
								accessibilityRole="adjustable"
								accessibilityLabel={`Drag ${label} to reorder`}
								accessibilityHint="Drag up or down, or use the move buttons."
								style={{
									padding: space.sm,
									borderRadius: corners.item,
									cursor: "pointer",
								}}
							>
								<Text variant="small">☰</Text>
							</View>
						</Row>
					</Row>
				</View>
			) : undefined}
			{editing ? (
				<View pointerEvents="none">{children}</View>
			) : (
				<Pressable onLongPress={onEdit} delayLongPress={550}>
					{children}
				</Pressable>
			)}
		</View>
	);
};
