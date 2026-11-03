import type { ReactElement } from "react";
import type { DialogDragResult } from "./dialog-drag-types";

export const DialogDragSurface = ({
	children,
}: {
	children: ReactElement;
	gesture: DialogDragResult["gesture"];
}): ReactElement => children;
