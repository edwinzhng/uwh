import type { ReactElement, ReactNode } from "react";

export const HomeCardDragSurface = ({
	label,
	position,
	total,
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
	<div
		role="slider"
		aria-valuemin={1}
		aria-valuemax={total}
		aria-valuenow={position}
		aria-valuetext={`Position ${position} of ${total}`}
		tabIndex={0}
		aria-label={`Reorder ${label}`}
		aria-description="Drag this card, or use the up and down arrow keys to move it."
		onKeyDown={(event): void => {
			if (event.key === "ArrowUp" && canMoveUp) {
				event.preventDefault();
				onMove(-1);
			}
			if (event.key === "ArrowDown" && canMoveDown) {
				event.preventDefault();
				onMove(1);
			}
		}}
		style={{ cursor: "grab", touchAction: "none" }}
	>
		{children}
	</div>
);
