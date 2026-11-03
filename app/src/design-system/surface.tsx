import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { CardBackground } from "./card-background";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	categoryPalette,
	corners,
	type ElevationToken,
	elevation,
	geometry,
	type SpaceToken,
	space,
} from "./tokens";

type Props = {
	children: ReactNode;
	header?: ReactNode;
	variant?: "default" | "subtle";
	density?: "compact" | "standard" | "spacious";
	elevation?: ElevationToken;
	padding?: SpaceToken;
	borderTone?: "neutral" | "success" | "warning" | "danger";
	tone?: CategoryColor;
};
export const Surface = ({
	children,
	header,
	variant = "default",
	density = "standard",
	elevation: level = "none",
	padding,
	borderTone = "neutral",
	tone,
}: Props): ReactElement => {
	const theme = useTheme();
	const contentPadding =
		padding !== undefined
			? space[padding]
			: density === "compact"
				? space.sm
				: density === "spacious"
					? space.lg
					: space.md;
	return (
		<View
			style={{
				borderColor:
					borderTone === "neutral"
						? theme.border
						: theme.colorScales[borderTone].border,
				borderWidth: geometry.border,
				borderRadius: corners.panel,
				padding: header === undefined ? contentPadding : 0,
				...elevation[level],
				overflow: "hidden",
			}}
		>
			<CardBackground
				color={
					tone
						? categoryPalette[theme.mode][tone].background
						: variant === "subtle"
							? theme.background.secondary
							: theme.background.card
				}
			/>
			{header === undefined ? (
				children
			) : (
				<>
					<View
						style={{
							padding: contentPadding,
							borderBottomWidth: geometry.border,
							borderBottomColor: theme.border,
						}}
					>
						{header}
					</View>
					<View style={{ padding: contentPadding }}>{children}</View>
				</>
			)}
		</View>
	);
};
