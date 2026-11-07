import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";

export const HomeCardDragSurface = ({
	label,
	canMoveUp,
	canMoveDown,
	onMove,
	children,
}: {
	label: string;
	position: number;
	total: number;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMove: (direction: -1 | 1) => void;
	children: ReactNode;
}): ReactElement => (
	<View
		accessible
		accessibilityRole="adjustable"
		accessibilityLabel={`Reorder ${label}`}
		accessibilityHint="Drag this card, or use the accessibility actions to move it."
		accessibilityActions={[
			...(canMoveUp ? [{ name: "decrement", label: "Move up" }] : []),
			...(canMoveDown ? [{ name: "increment", label: "Move down" }] : []),
		]}
		onAccessibilityAction={(event): void => {
			if (event.nativeEvent.actionName === "decrement" && canMoveUp) onMove(-1);
			if (event.nativeEvent.actionName === "increment" && canMoveDown)
				onMove(1);
		}}
	>
		{children}
	</View>
);
