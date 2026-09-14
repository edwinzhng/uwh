"use client";

import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";

export function DragContextWrapper({
	onDragEnd,
	children,
}: {
	onDragEnd: (event: DragEndEvent) => void;
	children: React.ReactNode;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={pointerWithin}
			onDragEnd={onDragEnd}
		>
			{children}
		</DndContext>
	);
}
