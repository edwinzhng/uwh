import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { type RoleTone, rolePalette } from "./role-glow";
import { useTheme } from "./theme";

export const rolePageTintOpacity = { light: 0.8, dark: 0.6 } as const;

export const RolePageTint = ({ role }: { role: RoleTone }): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{
					backgroundColor: rolePalette(role)[theme.mode],
					opacity: rolePageTintOpacity[theme.mode],
				},
			]}
		/>
	);
};
