import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardBackground } from "./card-background";
import { DashedBorder } from "./dashed-border";
import { type RoleTone, roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	corners,
	type ElevationToken,
	elevation,
	geometry,
	type SpaceToken,
	space,
	unmarkedCardColors,
} from "./tokens";

type Props = {
	children: ReactNode;
	roleTone?: RoleTone;
	header?: ReactNode;
	variant?: "default" | "subtle" | "plain";
	density?: "compact" | "standard" | "spacious";
	elevation?: ElevationToken;
	padding?: SpaceToken;
	paddingBottom?: SpaceToken;
	borderStyle?: "solid" | "dashed";
	borderTone?: "neutral" | "success" | "warning" | "danger";
	tone?: CategoryColor;
};
export const Surface = ({
	children,
	roleTone: explicitRole,
	header,
	variant = "default",
	density = "standard",
	elevation: level = "none",
	padding,
	paddingBottom,
	borderTone = "neutral",
	borderStyle = "solid",
}: Props): ReactElement => {
	const theme = useTheme();
	const roleTone = useRoleTone(explicitRole);
	if (variant === "plain")
		return (
			<View style={{ minWidth: 0, gap: header ? space.md : 0 }}>
				{header}
				{children}
			</View>
		);
	const unmarked = borderStyle === "dashed";
	const unmarkedColors = unmarkedCardColors[theme.mode];
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
				borderColor: unmarked
					? "transparent"
					: borderTone === "neutral"
						? theme.border
						: theme.colorScales[borderTone].border,
				borderWidth: geometry.border,
				borderStyle: "solid",
				borderRadius: corners.panel,
				padding: header === undefined ? contentPadding : 0,
				...(header === undefined && paddingBottom !== undefined
					? { paddingBottom: space[paddingBottom] }
					: {}),
				...elevation[level],
				...(roleTone ? { boxShadow: roleGlow(roleTone, theme.mode) } : {}),
				overflow: "hidden",
			}}
		>
			<CardBackground
				color={
					unmarked
						? borderTone === "neutral"
							? unmarkedColors.background
							: theme.colorScales[borderTone].subtle
						: borderTone !== "neutral"
							? theme.colorScales[borderTone].subtle
							: variant === "subtle"
								? theme.background.secondary
								: theme.background.card
				}
			/>
			{unmarked ? (
				<DashedBorder
					color={
						borderTone === "neutral"
							? unmarkedColors.border
							: theme.colorScales[borderTone].border
					}
				/>
			) : variant !== "subtle" ? (
				<CardAtmosphere />
			) : undefined}
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
