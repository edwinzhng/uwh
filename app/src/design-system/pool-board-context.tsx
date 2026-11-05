import {
	createContext,
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
} from "react";
import { View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
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
}: {
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const targets = useRef(new Map<string, DropTarget>());
	const drag = useSharedValue<PoolBoardDrag | undefined>(undefined);
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
					flexGrow: 1,
					borderRadius: corners.panel,
					padding: space.xs,
					gap: space.xs,
					backgroundColor: theme.background.secondary,
				}}
			>
				<LineupBackdrop />
				{children}
			</View>
		</PoolBoardContext.Provider>
	);
};
