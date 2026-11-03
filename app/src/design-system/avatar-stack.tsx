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
	imageUri,
	avatarIcon,
}: {
	people: readonly { personId?: string; name: string }[];
	name: string;
	icon?: IconName;
	imageUri?: string;
	avatarIcon?: IconName;
}): ReactElement => {
	const theme = useTheme();
	const visible = people.slice(0, 3);
	const size = geometry.compactAvatar + geometry.border * 2;
	const offset = geometry.touch - size;
	return (
		<View
			style={{
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}
		>
			{visible.length > 1 ? (
				visible.map((person, index) => (
					<View
						key={person.personId ?? person.name}
						style={{
							position: "absolute",
							top:
								visible.length === 3 && index < 2
									? 0
									: index === 0
										? 0
										: offset,
							right:
								visible.length === 3
									? index === 0
										? 0
										: index === 1
											? offset
											: offset / 2
									: index * offset,
							borderWidth: geometry.border,
							borderColor: theme.background.canvas,
							borderRadius: corners.pill,
						}}
					>
						<Avatar compact name={person.name} personId={person.personId} />
					</View>
				))
			) : visible.length ? (
				<Avatar
					compact
					name={visible.at(0)?.name ?? name}
					personId={visible.at(0)?.personId}
					uri={imageUri}
					icon={avatarIcon}
				/>
			) : (
				<View
					style={{
						width: geometry.compactAvatar,
						height: geometry.compactAvatar,
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
