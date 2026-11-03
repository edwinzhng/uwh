export const callbackAddress = (
	path: "auth-callback" | "connect-account" | "email-sign-in",
): string => new URL(`/${path}`, window.location.origin).toString();

export const openAuthBrowser = async (
	url: string,
	_returnUrl: string,
): Promise<string | undefined> => {
	window.location.assign(url);
	return undefined;
};

export const currentAuthPath = (_fallback: string): string =>
	`${window.location.pathname}${window.location.search}`;

export const handlesAuthCode = (): boolean =>
	typeof window !== "undefined" &&
	!["/connect-account", "/email-sign-in"].includes(
		window.location.pathname.replace(/\/+$/, ""),
	);
