import type { ReactElement, ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { font, space, typography } from "./tokens";

export const PoolBoardSection = ({
	label,
	children,
}: {
	label?: string;
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				gap: space.xs,
				flexGrow: 1,
			}}
		>
			{label ? (
				<Text
					style={{
						...typography.label,
						fontFamily: font.semibold,
						color: theme.text.primary,
					}}
				>
					{label}
				</Text>
			) : undefined}
			{children}
		</View>
	);
};
