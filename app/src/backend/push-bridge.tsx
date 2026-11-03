import { useMutation } from "convex/react";
import type { DevicePushToken } from "expo-notifications";
import { type Href, useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useApp } from "../demo/app-state";
import {
	installationId,
	nativePushAvailable,
	registerNativePush,
	watchNativePush,
} from "./native-push";
import { trackPushLifecycle } from "./push-lifecycle";
import { createPushRegistrationController } from "./push-registration";

export const PushBridge = (): ReactElement | undefined => {
	const register = useMutation(api.notifications.register);
	const unregister = useMutation(api.notifications.unregister);
	const router = useRouter();
	const { account } = useApp();
	const latestRouter = useRef(router);
	latestRouter.current = router;
	useEffect(() => {
		if (!nativePushAvailable || !account.id) return;
		const lifecycle = { active: true, stop: (): void => {} };
		const registration = createPushRegistrationController<DevicePushToken>({
			read: (token): ReturnType<typeof registerNativePush> =>
				registerNativePush(false, token),
			register: async (value): Promise<void> => {
				await register(value);
			},
			unregister: async (): Promise<void> => {
				const id = await installationId();
				if (lifecycle.active)
					await unregister({
						installationId: id,
						expectedUserId: account.id as Id<"users">,
					});
			},
		});
		const onRefresh = (token?: DevicePushToken): void => {
			void registration.refresh(token).catch((): void => {});
		};
		const stopRegistration = trackPushLifecycle(
			registration.stop,
			registration.resume,
		);
		onRefresh();
		void watchNativePush((path): void => {
			if (lifecycle.active) latestRouter.current.push(path as Href);
		}, onRefresh)
			.then((stop): void => {
				if (lifecycle.active) lifecycle.stop = stop;
				else stop();
			})
			.catch((): void => {});
		return (): void => {
			lifecycle.active = false;
			stopRegistration();
			lifecycle.stop();
		};
	}, [register, unregister, account.id]);
	return undefined;
};
