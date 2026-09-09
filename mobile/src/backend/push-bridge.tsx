import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { type ReactElement, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import {
	installationId,
	registerNativePush,
	watchNativePush,
} from "./native-push";

export const PushBridge = (): ReactElement | undefined => {
	const register = useMutation(api.notifications.register);
	const unregister = useMutation(api.notifications.unregister);
	const router = useRouter();
	useEffect(() => {
		const lifecycle = { active: true, stop: (): void => {} };
		const refresh = async (): Promise<void> => {
			const registration = await registerNativePush(false);
			if (!lifecycle.active) return;
			if (registration) await register(registration);
			else await unregister({ installationId: await installationId() });
		};
		const onRefresh = (): void => {
			void refresh().catch((): void => {});
		};
		onRefresh();
		void watchNativePush((path): void => {
			if (lifecycle.active) router.push(path as Href);
		}, onRefresh)
			.then((stop): void => {
				if (lifecycle.active) lifecycle.stop = stop;
				else stop();
			})
			.catch((): void => {});
		return (): void => {
			lifecycle.active = false;
			lifecycle.stop();
		};
	}, [register, unregister, router]);
	return undefined;
};
