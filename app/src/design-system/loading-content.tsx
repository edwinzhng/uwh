import type { ReactElement } from "react";
import { View } from "react-native";
import { geometry, space } from "./tokens";
import { usePageLoading } from "./use-page-loading";

export const LoadingContent = (): ReactElement => {
	usePageLoading(true);
	return <View style={{ minHeight: geometry.touch * 3 + space.sm * 4 }} />;
};
