import {
	createContext,
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
} from "react";
import { View } from "react-native";
import {
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
			hoveredPersonId: SharedValue<string | undefined>;
	  }
	| undefined
>(undefined);
export const PoolBoardGroup = ({
	children,
	backdrop = true,
}: {
	children: ReactNode;
	backdrop?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const targets = useRef(new Map<string, DropTarget>());
	const drag = useSharedValue<PoolBoardDrag | undefined>(undefined);
	const hoveredPersonId = useSharedValue<string | undefined>(undefined);
	useAnimatedReaction(
		() => drag.get()?.personId,
		(id, previous): void => {
			if (id !== previous) hoveredPersonId.set(undefined);
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
			hoveredPersonId,
		}),
		[drag, hoveredPersonId],
	);
	return (
		<PoolBoardContext.Provider value={value}>
			<View
				style={{
					overflow: "hidden",
					flexGrow: 1,
					borderRadius: backdrop ? corners.panel : 0,
					padding: space.xs,
					gap: space.xs,
					backgroundColor: backdrop
						? theme.background.secondary
						: "transparent",
				}}
			>
				{backdrop ? <LineupBackdrop /> : undefined}
				{children}
			</View>
		</PoolBoardContext.Provider>
	);
};
