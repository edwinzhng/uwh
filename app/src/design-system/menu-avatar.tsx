import type { ReactElement } from "react";
import { View } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import type { ChoicePerson } from "./picker-props";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MenuAvatar = ({
	person,
}: {
	person: ChoicePerson;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			style={{
				width: geometry.compactAvatar + space.xxs * 2,
				height: geometry.compactAvatar + space.xxs * 2,
				borderRadius: corners.pill,
				borderWidth: geometry.border,
				borderColor: theme.controlBorder,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{person.name ? (
				<Avatar
					name={person.name}
					personId={person.id}
					initials
					bright
					compact
				/>
			) : (
				<Icon name="user" size="sm" tone="secondary" />
			)}
		</View>
	);
};
