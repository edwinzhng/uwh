import {
	base64UrlBytes,
	validateBrowserSubscription,
} from "../domain/web-push";
import type { BrowserNotificationRegistration } from "./browser-push";

const installationKey = "uwh.browser-push.installation";
const enabledKey = "uwh.browser-push.enabled";
export const browserNotificationStatus = (): {
	supported: boolean;
	permission: "granted" | "denied" | "default" | "unsupported";
	installed: boolean;
	reason?: string;
} => {
	const supported =
		typeof window !== "undefined" &&
		window.isSecureContext &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window;
	return {
		supported,
		permission: supported ? Notification.permission : "unsupported",
		installed:
			typeof window !== "undefined" &&
			window.matchMedia("(display-mode: standalone)").matches,
		reason: supported
			? undefined
			: "Use HTTPS in a browser with push support. On iPhone, install the web app on your Home Screen first.",
	};
};
export const browserInstallationId = (): string | undefined =>
	typeof window === "undefined"
		? undefined
		: (window.localStorage.getItem(installationKey) ?? undefined);
export const watchBrowserNotifications = (
	refresh: () => void,
): (() => void) => {
	const active = (): void => {
		if (document.visibilityState === "visible") refresh();
	};
	const storage = (event: StorageEvent): void => {
		if (!event.key || event.key === enabledKey || event.key === installationKey)
			active();
	};
	window.addEventListener("online", active);
	window.addEventListener("storage", storage);
	document.addEventListener("visibilitychange", active);
	navigator.serviceWorker?.addEventListener("controllerchange", active);
	return (): void => {
		window.removeEventListener("online", active);
		window.removeEventListener("storage", storage);
		document.removeEventListener("visibilitychange", active);
		navigator.serviceWorker?.removeEventListener("controllerchange", active);
	};
};
export const registerBrowserNotifications = async (
	publicKey: string,
): Promise<BrowserNotificationRegistration> => {
	if (!browserNotificationStatus().supported)
		throw new Error(browserNotificationStatus().reason);
	const permission = await Notification.requestPermission();
	if (permission !== "granted")
		throw new Error(
			"Notifications are blocked. Allow this site in your browser settings, then enable again.",
		);
	const key = base64UrlBytes(publicKey);
	if (!key) throw new Error("Browser push configuration is invalid.");
	const registration = await navigator.serviceWorker.register(
		"/push-worker.js",
		{ scope: "/", updateViaCache: "none" },
	);
	const timeout: { id?: ReturnType<typeof setTimeout> } = {};
	await Promise.race([
		navigator.serviceWorker.ready,
		new Promise<never>((_resolve, reject) => {
			timeout.id = setTimeout(
				() =>
					reject(
						new Error(
							"Browser notification worker did not start. Reload and try again.",
						),
					),
				10000,
			);
		}),
	]).finally(() => {
		if (timeout.id) clearTimeout(timeout.id);
	});
	const previous = await registration.pushManager.getSubscription();
	const subscribedKey = previous?.options.applicationServerKey
		? new Uint8Array(previous.options.applicationServerKey)
		: undefined;
	const sameKey =
		subscribedKey &&
		key.length === subscribedKey.length &&
		key.every((value, index) => value === subscribedKey.at(index));
	if (previous && !sameKey && !(await previous.unsubscribe()))
		throw new Error(
			"Could not update browser notifications. Disable them and try again.",
		);
	const subscription =
		(previous && sameKey ? previous : undefined) ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: Uint8Array.from(key).buffer,
		}));
	const json = subscription.toJSON();
	const p256dh = json.keys?.p256dh;
	const auth = json.keys?.auth;
	if (!p256dh || !auth)
		throw new Error("This browser did not return notification keys.");
	const error = validateBrowserSubscription({
		endpoint: subscription.endpoint,
		keys: { p256dh, auth },
	});
	if (error) throw new Error(error);
	const installationId = browserInstallationId() ?? crypto.randomUUID();
	window.localStorage.setItem(installationKey, installationId);
	window.localStorage.setItem(enabledKey, "true");
	return {
		installationId,
		endpoint: subscription.endpoint,
		p256dh,
		auth,
		vapidKey: publicKey,
	};
};
export const disableBrowserNotifications = async (): Promise<
	string | undefined
> => {
	const installationId = browserInstallationId();
	const registration = await navigator.serviceWorker.getRegistration("/");
	const subscription = await registration?.pushManager.getSubscription();
	if (subscription && !(await subscription.unsubscribe()))
		throw new Error("Could not disable browser notifications. Try again.");
	window.localStorage.setItem(enabledKey, "false");
	return installationId;
};
export const restoreBrowserNotifications = async (
	publicKey: string,
): Promise<BrowserNotificationRegistration | undefined> => {
	if (
		!browserNotificationStatus().supported ||
		Notification.permission !== "granted" ||
		window.localStorage.getItem(enabledKey) !== "true"
	)
		return undefined;
	const installationId = browserInstallationId();
	const registration = await navigator.serviceWorker.getRegistration("/");
	const subscription = await registration?.pushManager.getSubscription();
	const key = base64UrlBytes(publicKey);
	const subscribedKey = subscription?.options.applicationServerKey
		? new Uint8Array(subscription.options.applicationServerKey)
		: undefined;
	if (
		!installationId ||
		!subscription ||
		!key ||
		!subscribedKey ||
		key.length !== subscribedKey.length ||
		key.some((value, index) => value !== subscribedKey.at(index))
	)
		return undefined;
	const json = subscription.toJSON();
	const p256dh = json.keys?.p256dh;
	const auth = json.keys?.auth;
	if (!p256dh || !auth) return undefined;
	return {
		installationId,
		endpoint: subscription.endpoint,
		p256dh,
		auth,
		vapidKey: publicKey,
	};
};
