import { requireNativeFeature } from "../platform/native-feature";

export const readMediaFile = async (
	uri: string,
	mime?: string,
): Promise<Blob> => {
	requireNativeFeature("FileSystem", "media attachments");
	const { File } = await import("expo-file-system");
	const file = new File(uri);
	return new Blob([await file.arrayBuffer()], { type: mime || file.type });
};
