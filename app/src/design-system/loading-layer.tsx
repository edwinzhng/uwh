import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import type { LoadingLayerProps } from "./loading-layer-props";

export const LoadingLayer = ({ children }: LoadingLayerProps): ReactElement => (
	<View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
		{children}
	</View>
);
