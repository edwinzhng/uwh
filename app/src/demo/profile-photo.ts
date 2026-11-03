import { Asset } from "expo-asset";
import type { PhotoSource } from "../domain/photo-crop";

export const reviewProfilePhotoSource = (): PhotoSource => {
	const asset = Asset.fromModule(require("../../assets/club-logo.png"));
	return {
		uri: asset.uri,
		width: asset.width ?? 256,
		height: asset.height ?? 256,
	};
};
