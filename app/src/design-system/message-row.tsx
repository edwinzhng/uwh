import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { space } from "./tokens";
export const MessageRow = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<View style={{ paddingHorizontal: space.md, paddingVertical: space.xs }}>
		{children}
	</View>
);
