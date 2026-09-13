import { openAuthSessionAsync } from "expo-web-browser";

export const callbackAddress = (
	path: "auth-callback" | "connect-account",
): string => `uwh-club://${path}`;

export const openAuthBrowser = async (
	url: string,
	returnUrl: string,
): Promise<string | undefined> => {
	const result = await openAuthSessionAsync(url, returnUrl);
	return result.type === "success" ? result.url : undefined;
};

export const currentAuthPath = (fallback: string): string => fallback;
export const handlesAuthCode = (): boolean => false;
