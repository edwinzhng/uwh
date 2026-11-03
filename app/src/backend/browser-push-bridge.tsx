import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useApp } from "../demo/app-state";
import {
	type BrowserNotificationRegistration,
	browserInstallationId,
	restoreBrowserNotifications,
	watchBrowserNotifications,
} from "./browser-push";
import { trackPushLifecycle } from "./push-lifecycle";
import { createPushRegistrationController } from "./push-registration";

export const BrowserPushBridge = (): undefined => {
	const { account } = useApp();
	const configuration = useQuery(
		api.web_push.configuration,
		Platform.OS === "web" ? {} : "skip",
	);
	const register = useMutation(api.web_push.register);
	const unregister = useMutation(api.web_push.unregister);
	useEffect(() => {
		const publicKey = configuration?.publicKey;
		if (!account.id || !publicKey) return;
		const registration = createPushRegistrationController<
			never,
			BrowserNotificationRegistration
		>({
			read: (): ReturnType<typeof restoreBrowserNotifications> =>
				restoreBrowserNotifications(publicKey),
			register: async (value): Promise<void> => {
				await register(value);
			},
			unregister: async (): Promise<void> => {
				const id = browserInstallationId();
				if (id)
					await unregister({
						installationId: id,
						expectedUserId: account.id as Id<"users">,
					});
			},
		});
		const refresh = (): void => {
			void registration.refresh().catch((): void => {});
		};
		const stopRegistration = trackPushLifecycle(
			registration.stop,
			registration.resume,
		);
		const stopWatching = watchBrowserNotifications(refresh);
		refresh();
		return (): void => {
			stopWatching();
			stopRegistration();
		};
	}, [account.id, configuration?.publicKey, register, unregister]);
	return undefined;
};
