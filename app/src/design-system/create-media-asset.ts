import { requireNativeFeature } from "../platform/native-feature";
import type { MediaAsset } from "./media-types";

export const createMediaAsset = async (
	bytes: ArrayBuffer,
	name: string,
	_mime: string,
): Promise<MediaAsset> => {
	requireNativeFeature("FileSystem", "private media");
	const { File, Paths } = await import("expo-file-system");
	const file = new File(
		Paths.cache,
		`private-media-${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
	);
	file.create({ overwrite: true });
	file.write(new Uint8Array(bytes));
	return {
		uri: file.uri,
		dispose: (): void => {
			if (file.exists) file.delete();
		},
	};
};
