import {
	createContext,
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import {
	runOnJS,
	type SharedValue,
	useAnimatedReaction,
	useSharedValue,
} from "react-native-reanimated";
import { LineupBackdrop } from "./lineup-backdrop";
import type { PoolBoardDrag } from "./pool-board-layout";
import { useTheme } from "./theme";
import { corners, space } from "./tokens";

type DropTarget = (personId: string, x: number, y: number) => Promise<void>;
export const PoolBoardContext = createContext<
	| {
			register: (id: string, target: DropTarget) => void;
			unregister: (id: string) => void;
			drop: DropTarget;
			drag: SharedValue<PoolBoardDrag | undefined>;
	  }
	| undefined
>(undefined);
export const PoolBoardGroup = ({
	children,
	active = true,
}: {
	children: ReactNode;
	active?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const targets = useRef(new Map<string, DropTarget>());
	const drag = useSharedValue<PoolBoardDrag | undefined>(undefined);
	const [dragging, setDragging] = useState(false);
	useAnimatedReaction(
		() => drag.get() !== undefined,
		(moving, previous): void => {
			if (moving !== previous) runOnJS(setDragging)(moving);
		},
	);
	const value = useMemo(
		() => ({
			register: (id: string, target: DropTarget): void => {
				targets.current.set(id, target);
			},
			unregister: (id: string): void => {
				targets.current.delete(id);
			},
			drop: async (personId: string, x: number, y: number): Promise<void> => {
				await Promise.all(
					Array.from(targets.current.values(), (target) =>
						target(personId, x, y),
					),
				);
			},
			drag,
		}),
		[drag],
	);
	return (
		<PoolBoardContext.Provider value={value}>
			<View
				style={{
					overflow: "hidden",
					borderRadius: corners.panel,
					padding: space.sm,
					gap: space.md,
					backgroundColor: theme.background.secondary,
				}}
			>
				<LineupBackdrop active={active && !dragging} />
				{children}
			</View>
		</PoolBoardContext.Provider>
	);
};
