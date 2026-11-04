import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { type RoleTone, roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { RoleTabMarker } from "./role-tab-marker";
import { useRoleTabTreatment } from "./role-tab-treatment";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";
export type TabOptionProps = {
	label: string;
	roleTone?: RoleTone;
	selected: boolean;
	indicatorReady?: boolean;
	disabled?: boolean;
	onPress: (keyboard?: boolean) => void;
	onFocus?: () => void;
};
export const TabOption = ({
	label,
	roleTone: explicitRole,
	selected,
	indicatorReady = false,
	disabled,
	onPress,
	onFocus,
}: TabOptionProps): ReactElement => {
	const theme = useTheme();
	const treatment = useRoleTabTreatment();
	const roleTone = useRoleTone(explicitRole);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected, disabled }}
			accessibilityLabel={label}
			accessibilityHint={
				roleTone
					? `${roleTone === "coach" ? "Coach" : "Admin"} access`
					: undefined
			}
			disabled={disabled}
			onPress={(): void => onPress()}
			onFocus={(): void => {
				setFocused(true);
				onFocus?.();
			}}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				minHeight: geometry.touch,
				position: "relative",
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				justifyContent: "center",
				paddingHorizontal: space.xs,
				borderRadius: corners.control,
				boxShadow:
					roleTone && treatment === "glow"
						? roleGlow(roleTone, theme.mode, true)
						: undefined,
				backgroundColor:
					selected && !indicatorReady
						? theme.background.selected
						: "transparent",
				opacity: disabled
					? geometry.disabledOpacity
					: pressed
						? geometry.pressedOpacity
						: 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			{roleTone && treatment === "dot" ? (
				<RoleTabMarker role={roleTone} treatment="dot" />
			) : undefined}
			<Text
				style={{
					fontFamily: font.medium,
					fontSize: typography.label.fontSize,
					lineHeight: typography.label.lineHeight,
					color: selected ? theme.text.primary : theme.text.secondary,
				}}
			>
				{label}
			</Text>
			{roleTone && (treatment === "underline" || treatment === "label") ? (
				<RoleTabMarker role={roleTone} treatment={treatment} />
			) : undefined}
		</Pressable>
	);
};
