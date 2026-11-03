import type { PhotoSource } from "../domain/photo-crop";
import { requireNativeFeature } from "../platform/native-feature";
import { profilePhotoSource } from "./profile-photo-source";

export const pickPhotoSource = async (): Promise<PhotoSource | undefined> => {
	requireNativeFeature("ExponentImagePicker", "photos");
	const picker = await import("expo-image-picker");
	const result = await picker.launchImageLibraryAsync({
		mediaTypes: ["images"],
		allowsMultipleSelection: false,
		quality: 1,
		exif: false,
	});
	const asset = result.assets?.at(0);
	return !result.canceled && asset
		? profilePhotoSource(asset.file ?? (await (await fetch(asset.uri)).blob()))
		: undefined;
};
