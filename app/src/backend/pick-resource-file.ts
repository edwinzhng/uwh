import {
	resourceDocumentMimes,
	resourceDocumentTypes,
} from "../domain/resource-documents";
import {
	type ResourceFilePurpose,
	resourceFileLimit,
	resourceMediaMime,
} from "../domain/resources";
import { requireNativeFeature } from "../platform/native-feature";
import { readImageBytes } from "./image-bytes";
import { readMediaFile } from "./read-media-file";

export type PickedResourceFile = { name: string; blob: Blob };
export const pickResourceFile = async (
	purpose: ResourceFilePurpose,
): Promise<PickedResourceFile | undefined> => {
	requireNativeFeature("ExpoDocumentPicker", "file attachments");
	const DocumentPicker = await import("expo-document-picker");
	const result = await DocumentPicker.getDocumentAsync({
		type:
			purpose === "video"
				? ["video/mp4", "video/quicktime", "video/webm"]
				: purpose === "voice"
					? ["audio/*"]
					: purpose === "thumbnail"
						? ["image/jpeg", "image/png", "image/webp"]
						: [
								"application/pdf",
								"image/jpeg",
								"image/png",
								"image/webp",
								...resourceDocumentMimes,
							],
		multiple: false,
		copyToCacheDirectory: true,
	});
	const asset = !result.canceled ? result.assets.at(0) : undefined;
	if (!asset) return undefined;
	const blob = asset.file ?? (await readMediaFile(asset.uri, asset.mimeType));
	if (!blob.size || blob.size > resourceFileLimit(purpose))
		throw new Error(
			`Choose a ${purpose} file under ${resourceFileLimit(purpose) / (1024 * 1024)} MB.`,
		);
	const mime = resourceMediaMime(
		new Uint8Array(await readImageBytes(blob.slice(0, 64))),
		purpose,
		purpose === "document"
			? (resourceDocumentTypes.find(
					(type) =>
						type.extension === asset.name.split(".").at(-1)?.toLowerCase(),
				)?.mime ?? blob.type)
			: blob.type,
		asset.name,
	);
	if (!mime) throw new Error(`This is not a supported ${purpose} file.`);
	return { name: asset.name, blob: blob.slice(0, blob.size, mime) };
};
