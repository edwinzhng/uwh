import type { ReactElement, ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const DialogGestureRoot = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<GestureHandlerRootView style={{ flex: 1 }}>
		{children}
	</GestureHandlerRootView>
);
