import { createContext } from "react";
import type { Gesture } from "react-native-gesture-handler";

export const LineupScrollContext = createContext<
	| {
			gesture: ReturnType<typeof Gesture.Native>;
			setDragging: (dragging: boolean) => void;
	  }
	| undefined
>(undefined);
