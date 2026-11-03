export type BrowserNotificationRegistration = {
	installationId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	vapidKey: string;
};
export const browserNotificationStatus = (): {
	supported: boolean;
	permission: "granted" | "denied" | "default" | "unsupported";
	installed: boolean;
	reason?: string;
} => ({
	supported: false,
	permission: "unsupported",
	installed: false,
	reason: "Browser notifications are available on the web app.",
});
export const browserInstallationId = (): string | undefined => undefined;
export const registerBrowserNotifications = async (
	_publicKey: string,
): Promise<BrowserNotificationRegistration> => {
	throw new Error("Open the web app to enable browser notifications.");
};
export const disableBrowserNotifications = async (): Promise<
	string | undefined
> => undefined;
export const restoreBrowserNotifications = async (
	_publicKey: string,
): Promise<BrowserNotificationRegistration | undefined> => undefined;
