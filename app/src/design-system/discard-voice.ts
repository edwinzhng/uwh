import { requireNativeFeature } from "../platform/native-feature";

export const discardVoice = async (uri: string): Promise<void> => {
	requireNativeFeature("FileSystem", "recording files");
	const { File } = await import("expo-file-system");
	const file = new File(uri);
	if (file.exists) file.delete();
};
