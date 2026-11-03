import type { ReactElement } from "react";
import { View } from "react-native";
import { Icon, type IconName } from "./icon";
import { type CategoryColor, space } from "./tokens";

export const FeatureIcon = ({
	name,
}: {
	name: IconName;
	category?: CategoryColor;
	large?: boolean;
}): ReactElement => (
	<View
		style={{
			width: space.lg,
			height: space.lg,
			flexShrink: 0,
			alignItems: "center",
			justifyContent: "center",
		}}
	>
		<Icon name={name} size="sm" tone="secondary" />
	</View>
);
