import {
	createContext,
	type ReactElement,
	type ReactNode,
	useMemo,
	useRef,
} from "react";
import { View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { LiquidBubbleScene } from "./liquid-bubble-scene";
import type { PoolBoardDrag } from "./pool-board-layout";
import { useTheme } from "./theme";
import { corners, space } from "./tokens";

type DropTarget = (personId: string, x: number, y: number) => void;
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
	const value = useMemo(
		() => ({
			register: (id: string, target: DropTarget): void => {
				targets.current.set(id, target);
			},
			unregister: (id: string): void => {
				targets.current.delete(id);
			},
			drop: (personId: string, x: number, y: number): void => {
				for (const target of targets.current.values()) target(personId, x, y);
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
				<LiquidBubbleScene active={active}>{children}</LiquidBubbleScene>
			</View>
		</PoolBoardContext.Provider>
	);
};
