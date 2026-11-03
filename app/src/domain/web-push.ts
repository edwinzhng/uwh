export type BrowserPushSubscription = {
	endpoint: string;
	keys: { p256dh: string; auth: string };
};
export const webPushEndpoint = (value: string): boolean => {
	try {
		const url = new URL(value);
		return (
			value.length <= 2048 &&
			url.protocol === "https:" &&
			!url.username &&
			!url.password &&
			!url.hash &&
			(!url.port || url.port === "443") &&
			[
				"fcm.googleapis.com",
				"updates.push.services.mozilla.com",
				"web.push.apple.com",
			].includes(url.hostname) &&
			url.pathname.length > 1
		);
	} catch {
		return false;
	}
};
export const base64UrlBytes = (value: string): Uint8Array | undefined => {
	if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1)
		return undefined;
	const decoded = atob(
		value.replaceAll("-", "+").replaceAll("_", "/") +
			"=".repeat((4 - (value.length % 4)) % 4),
	);
	return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
};
export const validVapidPublicKey = (value: string): boolean => {
	if (value.length !== 87) return false;
	const bytes = base64UrlBytes(value);
	return bytes?.length === 65 && bytes.at(0) === 4;
};
export const validateBrowserSubscription = (
	subscription: BrowserPushSubscription,
): string | undefined => {
	if (!webPushEndpoint(subscription.endpoint))
		return "This browser push provider is not supported.";
	if (
		!validVapidPublicKey(subscription.keys.p256dh) ||
		subscription.keys.auth.length !== 22 ||
		base64UrlBytes(subscription.keys.auth)?.length !== 16
	)
		return "Browser notification registration is invalid. Enable it again.";
	return undefined;
};
