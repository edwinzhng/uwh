import type { ReactElement } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { ActionMenu } from "./action-menu";
import { LineupRolePortrait } from "./lineup-role-portrait";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";
import { useLineupRoleDrop } from "./use-lineup-role-drop";

export const LineupRoleMenu = ({
	label,
	roleLabel,
	people,
	personId,
	displayName,
	onChange,
	dragScope = "combined",
}: {
	label: string;
	roleLabel: "Captain" | "Vice Captain" | "Ref" | "2nd Ref";
	people: readonly { id: string; name: string }[];
	personId?: string;
	displayName?: string;
	onChange?: (id?: string) => void;
	dragScope?: string;
}): ReactElement => {
	const theme = useTheme();
	const { target, highlightStyle } = useLineupRoleDrop({
		people,
		scope: dragScope,
		onAssign: onChange,
	});
	const roleColor =
		roleLabel === "Ref" || roleLabel === "2nd Ref" ? "#2766C9" : "#C63838";
	const selected = people.find((person) => person.id === personId);
	if (!onChange && personId && selected)
		return (
			<LineupRolePortrait
				roleLabel={roleLabel}
				personId={personId}
				name={selected.name}
				displayName={displayName}
			/>
		);

	return (
		<View
			style={{
				alignItems: "center",
				gap: 0,
				minWidth: geometry.touch + space.sm * 2,
			}}
		>
			<Text
				numberOfLines={1}
				style={{
					...typography.caption,
					fontFamily: font.semibold,
					color: roleColor,
					marginBottom: space.xxs,
				}}
			>
				{roleLabel === "Vice Captain" ? "VC" : roleLabel.toUpperCase()}
			</Text>
			<Animated.View
				ref={target}
				collapsable={false}
				style={{
					borderWidth: 1,
					borderStyle: "dashed",
					borderColor: roleColor,
					borderRadius: corners.pill,
					padding: 1,
				}}
			>
				<ActionMenu
					label={label}
					accessibilityLabel={label}
					avatar={{ id: selected?.id, name: selected?.name ?? "" }}
					avatarDiameter={(geometry.touch + space.xs) * 0.75}
					isDisabled={!onChange}
					groups={[
						{
							id: "people",
							items: [
								{
									id: "none",
									label: "Not assigned",
									onSelect: (): void => onChange?.(),
								},
								...people.map((person) => ({
									id: person.id,
									label: `${person.name}${person.id === personId ? " ✓" : ""}`,
									onSelect: (): void => onChange?.(person.id),
								})),
							],
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					accessible={false}
					style={[
						{
							position: "absolute",
							inset: space.xxs,
							borderRadius: corners.pill,
							borderWidth: geometry.focus,
							borderColor: theme.focus,
							backgroundColor: `${theme.focus}12`,
						},
						highlightStyle,
					]}
				/>
			</Animated.View>
			<Text
				numberOfLines={1}
				style={{
					...typography.navigation,
					fontFamily: font.semibold,
					color: theme.text.primary,
					minHeight: typography.navigation.lineHeight,
					maxWidth: geometry.touch + space.sm * 2,
				}}
			>
				{selected ? (displayName ?? selected.name) : "\u00a0"}
			</Text>
		</View>
	);
};
