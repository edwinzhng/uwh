import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as SecureStore from "expo-secure-store";
import { AppState, Linking, Platform } from "react-native";
import { notificationPath } from "../domain/push-routing";

type Registration = {
	installationId: string;
	token: string;
	platform: "ios" | "android";
};
const available = Boolean(requireOptionalNativeModule("ExpoPushTokenManager"));
const projectId =
	process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.easConfig?.projectId;
export const nativePushAvailable = available && Boolean(projectId);
const installationKey = "crocs.push.installation";
const enabledKey = "crocs.push.enabled";
export const installationId = async (): Promise<string> => {
	const existing = await SecureStore.getItemAsync(installationKey);
	if (existing) return existing;
	const id = randomUUID();
	await SecureStore.setItemAsync(installationKey, id);
	return id;
};
export const registerNativePush = async (
	request: boolean,
): Promise<Registration | undefined> => {
	if (!nativePushAvailable) {
		if (request)
			throw new Error("Push needs an EAS project and a new native build.");
		return undefined;
	}
	const notifications = await import("expo-notifications");
	if (Platform.OS === "android")
		await notifications.setNotificationChannelAsync("club", {
			name: "Club updates",
			importance: notifications.AndroidImportance.DEFAULT,
		});
	const current = await notifications.getPermissionsAsync();
	const permission =
		request && !current.granted
			? await notifications.requestPermissionsAsync()
			: current;
	if (!permission.granted) {
		if (request)
			throw new Error("Allow notifications in your device settings.");
		return undefined;
	}
	if (!request && (await SecureStore.getItemAsync(enabledKey)) !== "true")
		return undefined;
	const token = await notifications.getExpoPushTokenAsync({ projectId });
	return {
		installationId: await installationId(),
		token: token.data,
		platform: Platform.OS === "ios" ? "ios" : "android",
	};
};
export const setPushEnabled = (enabled: boolean): Promise<void> =>
	SecureStore.setItemAsync(enabledKey, String(enabled));
export const disableNativePush = async (): Promise<void> => {
	await setPushEnabled(false);
	if (available)
		await (await import("expo-notifications")).dismissAllNotificationsAsync();
};
export const watchNativePush = async (
	navigate: (path: string) => void,
	refresh: () => void,
): Promise<() => void> => {
	if (!available) return (): void => {};
	const notifications = await import("expo-notifications");
	notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: false,
			shouldSetBadge: false,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	});
	const open = (data?: Record<string, unknown>): void => {
		const path = notificationPath(data?.path);
		if (path) navigate(path);
	};
	const last = await notifications.getLastNotificationResponseAsync();
	if (last) {
		open(last.notification.request.content.data);
		await notifications.clearLastNotificationResponseAsync();
	}
	const response = notifications.addNotificationResponseReceivedListener(
		(entry): void => {
			open(entry.notification.request.content.data);
			void notifications.clearLastNotificationResponseAsync();
		},
	);
	const tokens = notifications.addPushTokenListener(refresh);
	const active = AppState.addEventListener("change", (state): void => {
		if (state === "active") refresh();
	});
	return (): void => {
		response.remove();
		tokens.remove();
		active.remove();
	};
};
export const openNotificationSettings = (): Promise<void> =>
	Linking.openSettings();
