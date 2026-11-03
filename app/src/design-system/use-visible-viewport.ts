import { useWindowDimensions } from "react-native";
import type { ViewportMetrics } from "./viewport-metrics";

export const useVisibleViewport = (_enabled = true): ViewportMetrics => {
	const { height, width } = useWindowDimensions();
	return { height, width, top: 0, keyboardVisible: false };
};
