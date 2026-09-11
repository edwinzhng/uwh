import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "./theme";
import {
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
};
export const Surface = ({
	children,
	header,
	variant = "default",
	density = "standard",
	elevation: level = "none",
	padding,
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
				backgroundColor:
					variant === "subtle"
						? theme.background.secondary
						: theme.background.primary,
				borderColor: theme.border,
				borderWidth: geometry.border,
				borderRadius: level === "overlay" ? corners.overlay : corners.panel,
				padding: header === undefined ? contentPadding : 0,
				...elevation[level],
				overflow: "hidden",
			}}
		>
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
