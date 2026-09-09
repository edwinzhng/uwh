import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { type SpaceToken, space } from "./tokens";

type Props = {
	children: ReactNode;
	gap?: SpaceToken;
	padding?: SpaceToken;
	grow?: boolean;
};
export const Stack = ({
	children,
	gap = "md",
	padding = "none",
	grow = false,
}: Props): ReactElement => (
	<View
		style={{
			gap: space[gap],
			padding: space[padding],
			flex: grow ? 1 : undefined,
			minWidth: 0,
		}}
	>
		{children}
	</View>
);
