import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { ClubCardOptionBackground } from "./club-card-option-background";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { Text } from "./text";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	categoryPalette,
	corners,
	geometry,
	space,
} from "./tokens";

export type ClubCardTreatment =
	| "color-field"
	| "color-field-row"
	| "watercolor-soft"
	| "watercolor-bold"
	| "corner"
	| "compact"
	| "hybrid"
	| "hybrid-watercolor"
	| "stat";
export const ClubCardOption = ({
	title,
	icon,
	category,
	stat,
	onPress,
	treatment,
}: {
	title: string;
	icon: IconName;
	category: CategoryColor;
	stat?: { value: number; label: string };
	onPress: () => void;
	treatment: ClubCardTreatment;
}): ReactElement => {
	const theme = useTheme();
	const roleTone = useRoleTone();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const hybrid =
		treatment === "hybrid" ||
		treatment === "hybrid-watercolor" ||
		treatment === "color-field-row";
	const compact = treatment === "compact" || hybrid;
	const iconTile = treatment === "compact";
	const statCard = treatment === "stat";
	const stats = stat ? (
		<View
			style={{
				flexDirection: "row",
				alignItems: "baseline",
				flexShrink: 0,
				gap: space.xs,
			}}
		>
			<Text
				variant={compact ? "h4" : "number"}
				tone={statCard ? "highlight" : "primary"}
			>
				{stat.value}
			</Text>
			<Text
				variant={statCard ? "small" : "caption"}
				tone={statCard ? "highlight" : "secondary"}
				weight={statCard ? "medium" : undefined}
				lines={1}
			>
				{stat.label}
			</Text>
		</View>
	) : undefined;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={
				stat ? `${title}, ${stat.value} ${stat.label}` : title
			}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={{
				flex: 1,
				minWidth: 0,
				borderRadius: corners.panel,
				boxShadow: roleTone ? roleGlow(roleTone, theme.mode) : undefined,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
			}}
		>
			{({ pressed }): ReactElement => (
				<View
					style={{
						flex: 1,
						minWidth: 0,
						minHeight:
							treatment === "color-field"
								? geometry.touch + space.sm
								: hybrid
									? stat
										? space.xxxl
										: geometry.touch + space.sm
									: compact
										? geometry.touch + space.lg
										: treatment === "watercolor-bold"
											? geometry.touch * 2 + space.xl
											: statCard
												? geometry.touch * 2
												: geometry.touch * 2 + space.md,
						padding: (compact && !hybrid) || statCard ? space.sm : space.xs,
						justifyContent: compact ? "center" : "flex-start",
						borderWidth: stat && !statCard ? 0 : geometry.border,
						borderColor: theme.border,
						borderRadius: corners.panel,
						overflow: "hidden",
						backgroundColor: theme.background.card,
						gap: space.xs,
					}}
				>
					<ClubCardOptionBackground
						treatment={treatment}
						category={category}
						seed={`${title}:${treatment}`}
					/>
					{pressed || hovered ? (
						<View
							pointerEvents="none"
							style={{
								position: "absolute",
								inset: 0,
								backgroundColor: theme.background.hover,
								opacity: pressed ? 0.25 : 0.12,
							}}
						/>
					) : undefined}
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: compact && !hybrid ? space.xs : space.xxs,
							minWidth: 0,
						}}
					>
						<View
							style={{
								width: iconTile ? space.xl : geometry.iconSmall,
								height: iconTile ? space.xl : geometry.iconSmall,
								alignItems: "center",
								justifyContent: "center",
								borderRadius: corners.control,
								backgroundColor: iconTile
									? categoryPalette[theme.mode][category].background
									: "transparent",
								flexShrink: 0,
							}}
						>
							<Icon name={icon} size="sm" tone="secondary" />
						</View>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text variant="small" weight="semibold" lines={1}>
								{title}
							</Text>
						</View>
						{compact ? stats : undefined}
						<Icon name="chevron" size="sm" tone="secondary" />
					</View>
					{!compact ? stats : undefined}
				</View>
			)}
		</Pressable>
	);
};
