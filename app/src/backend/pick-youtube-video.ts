import { Platform } from "react-native";
import { resourceMediaMime } from "../domain/resources";
import { validateYoutubeUpload } from "../domain/youtube-upload";
import { requireNativeFeature } from "../platform/native-feature";
import { readImageBytes } from "./image-bytes";
import { readVideoChunk } from "./read-video-chunk";

export type PickedYoutubeVideo = {
	name: string;
	mime: string;
	size: number;
	read: (start: number, end: number) => Promise<Blob>;
};
export const pickYoutubeVideo = async (): Promise<
	PickedYoutubeVideo | undefined
> => {
	requireNativeFeature("ExpoDocumentPicker", "video uploads");
	const { getDocumentAsync } = await import("expo-document-picker");
	const result = await getDocumentAsync({
		type: ["video/mp4", "video/quicktime", "video/webm"],
		multiple: false,
		copyToCacheDirectory: true,
	});
	const asset = !result.canceled ? result.assets.at(0) : undefined;
	if (!asset) return undefined;
	const file =
		Platform.OS === "web"
			? asset.file
			: new (await import("expo-file-system")).File(asset.uri);
	if (!file) throw new Error("Choose a video file.");
	const error = validateYoutubeUpload(file.size, asset.mimeType ?? file.type);
	if (error) throw new Error(error);
	const mime = resourceMediaMime(
		new Uint8Array(
			await readImageBytes(
				await readVideoChunk(file, 0, Math.min(64, file.size), file.type),
			),
		),
		"video",
		asset.mimeType ?? file.type,
		asset.name,
	);
	if (!mime) throw new Error("Choose an MP4, MOV or WebM video.");
	return {
		name: asset.name,
		mime,
		size: file.size,
		read: (start, end): Promise<Blob> => readVideoChunk(file, start, end, mime),
	};
};
