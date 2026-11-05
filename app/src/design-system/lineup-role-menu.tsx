import type { ReactElement } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { ActionMenu } from "./action-menu";
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
	roleLabel: "Captain" | "Ref";
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
	const selected = people.find((person) => person.id === personId);
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.xxs,
				minWidth: 0,
				maxWidth: "49%",
			}}
		>
			<View style={{ flexShrink: 1, minWidth: 0 }}>
				<Text
					numberOfLines={1}
					style={{
						...typography.caption,
						fontFamily: font.regular,
						color: theme.text.secondary,
					}}
				>
					{roleLabel}
				</Text>
				{selected ? (
					<Text
						numberOfLines={1}
						style={{
							...typography.navigation,
							fontFamily: font.regular,
							color: theme.text.primary,
						}}
					>
						{displayName ?? selected.name}
					</Text>
				) : undefined}
			</View>
			<Animated.View ref={target} collapsable={false}>
				<ActionMenu
					label={label}
					accessibilityLabel={label}
					avatar={{ id: selected?.id, name: selected?.name ?? "" }}
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
		</View>
	);
};
