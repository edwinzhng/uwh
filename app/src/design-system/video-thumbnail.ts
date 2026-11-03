import { requireNativeFeature } from "../platform/native-feature";

export const captureVideoThumbnail = async (
	uri: string,
	seconds = 0,
): Promise<Blob> => {
	requireNativeFeature("FileSystem", "video thumbnails");
	requireNativeFeature("ExpoVideoThumbnails", "video thumbnails");
	const [{ File }, { getThumbnailAsync }] = await Promise.all([
		import("expo-file-system"),
		import("expo-video-thumbnails"),
	]);
	const result = await getThumbnailAsync(uri, {
		time: Math.max(0, seconds) * 1000,
		quality: 0.65,
	});
	const file = new File(result.uri);
	try {
		return new Blob([await file.arrayBuffer()], { type: "image/jpeg" });
	} finally {
		if (file.exists) file.delete();
	}
};
