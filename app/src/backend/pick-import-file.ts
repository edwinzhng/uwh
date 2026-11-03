import { requireNativeFeature } from "../platform/native-feature";
export const pickImportFile = async (): Promise<
	{ name: string; contents: string } | undefined
> => {
	requireNativeFeature("ExpoDocumentPicker", "file imports");
	const DocumentPicker = await import("expo-document-picker");
	const result = await DocumentPicker.getDocumentAsync({
		type: [
			"text/csv",
			"text/comma-separated-values",
			"text/plain",
			"application/vnd.ms-excel",
		],
		copyToCacheDirectory: true,
		multiple: false,
		base64: false,
	});
	if (result.canceled) return;
	const asset = result.assets.at(0);
	if (!asset) return;
	if ((asset.size ?? 0) > 2_000_000)
		throw new Error("Choose a CSV smaller than 2 MB.");
	const readNativeFile = async (): Promise<string> => {
		requireNativeFeature("FileSystem", "file imports");
		const { File } = await import("expo-file-system");
		return new File(asset.uri).text();
	};
	const contents = asset.file
		? await asset.file.text()
		: await readNativeFile();
	return { name: asset.name, contents };
};
