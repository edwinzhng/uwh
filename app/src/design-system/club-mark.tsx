import type { ReactElement } from "react";
import { Image } from "react-native";
import artwork from "../../assets/club-logo.png";
import { geometry } from "./tokens";

export const ClubMark = (): ReactElement => (
	<Image
		source={artwork}
		accessibilityLabel="UWH Club"
		resizeMode="contain"
		style={{
			width: geometry.touch,
			height: geometry.touch,
			borderRadius: geometry.touch / 2,
		}}
	/>
);
