import type { ReactElement, ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

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
				gap: space.md,
				borderWidth: label ? geometry.border : 0,
				borderColor: theme.border,
				borderRadius: corners.panel,
				padding: label ? space.xs : 0,
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
