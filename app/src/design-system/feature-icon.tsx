import type { ReactElement } from "react";
import { View } from "react-native";
import { CardBackground } from "./card-background";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import {
	type CategoryColor,
	categoryPalette,
	corners,
	geometry,
	space,
} from "./tokens";

export const FeatureIcon = ({
	name,
	category,
	large = false,
}: {
	name: IconName;
	category?: CategoryColor;
	large?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const color = category ? categoryPalette[theme.mode][category] : undefined;
	const size = large ? geometry.touch + space.sm : geometry.avatar;
	return (
		<View
			style={{
				width: size,
				height: size,
				flexShrink: 0,
				borderRadius: corners.control,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: color ? undefined : theme.background.secondary,
			}}
		>
			{color ? (
				<CardBackground
					color={color.background}
					category={category}
					seed={name}
					radius={corners.control}
				/>
			) : undefined}
			<Icon name={name} color={color?.foreground ?? theme.text.secondary} />
		</View>
	);
};
