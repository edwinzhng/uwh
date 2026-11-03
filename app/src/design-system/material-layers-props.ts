import type { ImageSourcePropType } from "react-native";

export type MaterialLayersProps = {
	images: readonly [ImageSourcePropType, ImageSourcePropType];
	variation: number;
	animated: boolean;
};
