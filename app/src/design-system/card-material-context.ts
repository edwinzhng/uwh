import { createContext } from "react";
import type { SharedValue } from "react-native-reanimated";

export const CardMaterialContext = createContext<
	SharedValue<number> | undefined
>(undefined);
