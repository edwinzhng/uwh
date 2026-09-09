import type { ReactElement } from "react";
import { Image, type ImageSourcePropType, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { geometry, radius, space } from "./tokens";

export const BrandIdentity = ({
	name,
	logo,
}: {
	name: string;
	logo?: ImageSourcePropType;
}): ReactElement => (
	<View
		style={{
			flexDirection: "row",
			alignItems: "center",
			gap: space.xs,
			flexShrink: 1,
			minWidth: 0,
		}}
	>
		{logo ? (
			<Image
				source={logo}
				accessible={false}
				resizeMode="contain"
				style={{
					width: geometry.avatar,
					height: geometry.avatar,
					borderRadius: radius.round,
				}}
			/>
		) : (
			<Icon name="shield" />
		)}
		<View style={{ flexShrink: 1, minWidth: 0 }}>
			<Text variant="label" lines={1}>
				{name}
			</Text>
		</View>
	</View>
);
