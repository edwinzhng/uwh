import { requireNativeFeature } from "./native-feature";

export const setStringAsync = async (text: string): Promise<boolean> => {
	requireNativeFeature("ExpoClipboard", "clipboard");
	const clipboard = await import("expo-clipboard");
	return clipboard.setStringAsync(text);
};
