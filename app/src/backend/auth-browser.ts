import { requireNativeFeature } from "../platform/native-feature";

export const callbackAddress = (
	path: "auth-callback" | "connect-account" | "email-sign-in",
): string => `uwh-club://${path}`;

export const openAuthBrowser = async (
	url: string,
	returnUrl: string,
): Promise<string | undefined> => {
	requireNativeFeature("ExpoWebBrowser", "browser sign-in");
	const { openAuthSessionAsync } = await import("expo-web-browser");
	const result = await openAuthSessionAsync(url, returnUrl);
	return result.type === "success" ? result.url : undefined;
};

export const currentAuthPath = (fallback: string): string => fallback;
export const handlesAuthCode = (): boolean => false;
