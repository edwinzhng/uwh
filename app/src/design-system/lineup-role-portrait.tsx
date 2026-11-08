import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Avatar } from "./avatar";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const LineupRolePortrait = ({
	roleLabel,
	personId,
	name,
	displayName,
}: {
	roleLabel: "Captain" | "Vice Captain" | "Ref" | "2nd Ref";
	personId: string;
	name: string;
	displayName?: string;
}): ReactElement => {
	const theme = useTheme();
	const color =
		roleLabel === "Ref" || roleLabel === "2nd Ref" ? "#2766C9" : "#C63838";
	const diameter = (geometry.touch + space.xs) * 0.75;
	return (
		<View style={{ alignItems: "center", minWidth: diameter + space.sm }}>
			<Text
				numberOfLines={1}
				accessibilityLabel={roleLabel}
				style={{
					...typography.caption,
					fontFamily: font.semibold,
					color: theme.text.primary,
					marginBottom: space.xxs,
				}}
			>
				{roleLabel === "Vice Captain" ? "VC" : roleLabel.toUpperCase()}
			</Text>
			<View
				style={{
					borderWidth: 1,
					borderStyle: "dashed",
					borderColor: color,
					borderRadius: corners.pill,
					padding: 1,
				}}
			>
				<Avatar name={name} personId={personId} initials diameter={diameter} />
			</View>
			<Text
				numberOfLines={1}
				style={{
					...typography.navigation,
					fontFamily: font.semibold,
					color: theme.text.primary,
					maxWidth: geometry.touch + space.sm * 2,
				}}
			>
				{displayName ?? name}
			</Text>
		</View>
	);
};
