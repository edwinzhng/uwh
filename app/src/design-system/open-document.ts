import { requireNativeFeature } from "../platform/native-feature";

export const openDocument = async (
	contents: ArrayBuffer,
	name: string,
	mime: string,
): Promise<void> => {
	requireNativeFeature("FileSystem", "document downloads");
	requireNativeFeature("ExpoSharing", "document downloads");
	const [{ File, Paths }, Sharing] = await Promise.all([
		import("expo-file-system"),
		import("expo-sharing"),
	]);
	if (!(await Sharing.isAvailableAsync()))
		throw new Error("File sharing is unavailable on this device.");
	const filename = name.replace(/[^a-zA-Z0-9._-]/g, "-") || "document.pdf";
	const file = new File(Paths.cache, `resource-${Date.now()}-${filename}`);
	file.create({ overwrite: true });
	try {
		file.write(new Uint8Array(contents));
		await Sharing.shareAsync(file.uri, {
			mimeType: mime,
			dialogTitle: name,
		});
	} finally {
		if (file.exists) file.delete();
	}
};
