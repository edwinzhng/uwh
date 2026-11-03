import { createContext, type RefObject } from "react";
import type { ScrollView } from "react-native";

export const PaginationViewport = createContext<
	RefObject<ScrollView | null> | undefined
>(undefined);
