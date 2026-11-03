import type { ReactElement } from "react";
import { View } from "react-native";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const AvatarStack = ({
	people,
	name,
	icon = "users",
}: {
	people: readonly { personId?: string; name: string }[];
	name: string;
	icon?: IconName;
}): ReactElement => {
	const theme = useTheme();
	const pair = people.slice(0, 2);
	return (
		<View
			style={{
				width: pair.length > 1 ? geometry.touch : geometry.avatar,
				height: pair.length > 1 ? geometry.touch : geometry.avatar,
				flexShrink: 0,
			}}
		>
			{pair.length > 1 ? (
				pair.map((person, index) => (
					<View
						key={person.personId ?? person.name}
						style={{
							position: "absolute",
							...(index === 0 ? { top: 0, right: 0 } : { left: 0, bottom: 0 }),
							borderWidth: geometry.border,
							borderColor: theme.background.canvas,
							borderRadius: corners.pill,
						}}
					>
						<Avatar
							mini={index === 0}
							compact={index !== 0}
							name={person.name}
							personId={person.personId}
						/>
					</View>
				))
			) : pair.length ? (
				<Avatar
					name={pair.at(0)?.name ?? name}
					personId={pair.at(0)?.personId}
				/>
			) : (
				<View
					style={{
						flex: 1,
						borderRadius: corners.pill,
						backgroundColor: theme.background.secondary,
						alignItems: "center",
						justifyContent: "center",
						padding: space.xxs,
					}}
				>
					<Icon name={icon} tone="secondary" />
				</View>
			)}
		</View>
	);
};
