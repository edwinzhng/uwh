export const nativePushAvailable = false;
export const installationId = async (): Promise<string> => "web";
export const registerNativePush = async (
	_request: boolean,
): Promise<
	| { installationId: string; token: string; platform: "ios" | "android" }
	| undefined
> => undefined;
export const setPushEnabled = async (_enabled: boolean): Promise<void> => {};
export const disableNativePush = async (): Promise<void> => {};
export const watchNativePush =
	async (
		_navigate: (path: string) => void,
		_refresh: () => void,
	): Promise<() => void> =>
	(): void => {};
export const openNotificationSettings = async (): Promise<void> => {};
