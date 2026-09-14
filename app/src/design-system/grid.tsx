import { Children, type ReactElement, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { geometry, type SpaceToken, space } from "./tokens";

type Props = { children: ReactNode; gap?: SpaceToken };
export const Grid = ({ children, gap = "lg" }: Props): ReactElement => {
	const { width } = useWindowDimensions();
	const wide = width >= geometry.wide;
	return (
		<View
			style={{
				flexDirection: wide ? "row" : "column",
				gap: space[gap],
				alignItems: "stretch",
			}}
		>
			{Children.map(children, (child) => (
				<View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>{child}</View>
			))}
		</View>
	);
};
