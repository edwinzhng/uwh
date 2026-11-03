import type { ReactElement } from "react";
import { Image } from "react-native";
import artwork from "../../assets/app-icon.png";

export const UwhMark = ({
	size = 40,
}: {
	size?: 24 | 32 | 40 | 56;
}): ReactElement => (
	<Image
		source={artwork}
		accessible={false}
		resizeMode="contain"
		style={{ width: size, height: size, borderRadius: size / 5 }}
	/>
);
