import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { type SpaceToken, space } from "./tokens";

type Props = {
	children: ReactNode;
	gap?: SpaceToken;
	align?: "center" | "start" | "end";
	justify?: "start" | "between" | "center" | "end";
	wrap?: boolean;
};
export const Row = ({
	children,
	gap = "sm",
	align = "center",
	justify = "start",
	wrap = false,
}: Props): ReactElement => (
	<View
		style={{
			flexDirection: "row",
			gap: space[gap],
			alignItems:
				align === "start"
					? "flex-start"
					: align === "end"
						? "flex-end"
						: "center",
			justifyContent:
				justify === "between"
					? "space-between"
					: justify === "center"
						? "center"
						: justify === "end"
							? "flex-end"
							: "flex-start",
			flexWrap: wrap ? "wrap" : "nowrap",
		}}
	>
		{children}
	</View>
);
