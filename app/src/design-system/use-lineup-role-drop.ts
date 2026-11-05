import { useContext, useEffect, useId } from "react";
import type { View } from "react-native";
import {
	type AnimatedRef,
	measure,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { PoolBoardContext } from "./pool-board-context";
import {
	type PoolBoardDrag,
	type PoolDropFrame,
	poolBoardDropHighlighted,
} from "./pool-board-layout";

export const useLineupRoleDrop = ({
	people,
	scope,
	onAssign,
}: {
	people: readonly { id: string }[];
	scope: string;
	onAssign?: (id: string) => void;
}): {
	target: AnimatedRef<View>;
	highlightStyle: ReturnType<typeof useAnimatedStyle<{ opacity: number }>>;
} => {
	const boards = useContext(PoolBoardContext);
	const localDrag = useSharedValue<PoolBoardDrag | undefined>(undefined);
	const drag = boards?.drag ?? localDrag;
	const target = useAnimatedRef<View>();
	const frame = useSharedValue<PoolDropFrame | undefined>(undefined);
	const id = useId();
	const enabled = Boolean(onAssign);
	const eligibleIds = people.map((person) => person.id);
	useEffect(() => {
		if (!boards || !onAssign) return;
		boards.register(id, async (personId, x, y): Promise<void> => {
			const view = target.current;
			if (!eligibleIds.includes(personId) || !view) return;
			await new Promise<void>((resolve) => {
				view.measureInWindow((left, top, width, height): void => {
					if (
						poolBoardDropHighlighted(
							{ personId, scope: drag.get()?.scope ?? "", x, y },
							{ x: left, y: top, width, height },
							scope,
						)
					)
						onAssign(personId);
					resolve();
				});
			});
		});
		return (): void => boards.unregister(id);
	}, [boards, onAssign, eligibleIds, target, id, scope, drag]);
	useAnimatedReaction(
		() => drag.get()?.personId,
		(personId, previous): void => {
			if (personId && personId !== previous) {
				const value = measure(target);
				frame.set(
					value
						? {
								x: value.pageX,
								y: value.pageY,
								width: value.width,
								height: value.height,
							}
						: undefined,
				);
			} else if (!personId) frame.set(undefined);
		},
	);
	const highlightStyle = useAnimatedStyle(() => {
		const value = drag.get();
		return {
			opacity:
				enabled &&
				value &&
				eligibleIds.includes(value.personId) &&
				poolBoardDropHighlighted(value, frame.get(), scope)
					? 1
					: 0,
		};
	});
	return { target, highlightStyle };
};
