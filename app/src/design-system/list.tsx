import { Children, type ReactElement, type ReactNode } from "react";
import { View } from "react-native";
import { Stack } from "./stack";
import { useTheme } from "./theme";
import { geometry, type SpaceToken, space } from "./tokens";
export const List = ({
	children,
	gap = "none",
	separators,
}: {
	children: ReactNode;
	gap?: SpaceToken;
	separators?: "full" | "leading";
}): ReactElement => {
	const theme = useTheme();
	if (!separators) return <Stack gap={gap}>{children}</Stack>;
	const items = Children.toArray(children);
	return (
		<Stack gap={gap}>
			{Children.map(items, (child, index) => (
				<Stack gap="none">
					{child}
					{separators && index < items.length - 1 ? (
						<View
							accessible={false}
							style={{
								height: geometry.border,
								backgroundColor: theme.border,
								opacity: 0.6,
								marginLeft:
									separators === "leading" ? geometry.touch + space.sm : 0,
								marginRight: 0,
							}}
						/>
					) : undefined}
				</Stack>
			))}
		</Stack>
	);
};
