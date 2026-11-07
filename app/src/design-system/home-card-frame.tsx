import {
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
	useState,
} from "react";
import { PanResponder, Pressable, View } from "react-native";
import { HomeCardDragSurface } from "./home-card-drag-surface";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Text } from "./text";
import { space } from "./tokens";

export type HomeCardFramePosition = { y: number; height: number };
export const HomeCardFrame = ({
	label,
	position,
	total,
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
	position: number;
	total: number;
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
					</Row>
				</View>
			) : undefined}
			{editing ? (
				<View {...pan.panHandlers}>
					<HomeCardDragSurface
						position={position}
						total={total}
						label={label}
						canMoveUp={canMoveUp}
						canMoveDown={canMoveDown}
						onMove={onMove}
					>
						<View pointerEvents="none">{children}</View>
					</HomeCardDragSurface>
				</View>
			) : (
				<Pressable onLongPress={onEdit} delayLongPress={550}>
					{children}
				</Pressable>
			)}
		</View>
	);
};
