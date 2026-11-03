import type { ReactElement } from "react";
import { GestureDetector } from "react-native-gesture-handler";
import type { DialogDragResult } from "./dialog-drag-types";

export const DialogDragSurface = ({
	children,
	gesture,
}: {
	children: ReactElement;
	gesture: DialogDragResult["gesture"];
}): ReactElement =>
	gesture ? (
		<GestureDetector gesture={gesture}>{children}</GestureDetector>
	) : (
		children
	);
