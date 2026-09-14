import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
export const pickImportFile = async (): Promise<
	{ name: string; contents: string } | undefined
> => {
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
	const contents = asset.file
		? await asset.file.text()
		: await new File(asset.uri).text();
	return { name: asset.name, contents };
};
