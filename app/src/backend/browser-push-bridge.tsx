import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { restoreBrowserNotifications } from "./browser-push";

export const BrowserPushBridge = (): undefined => {
	const { account } = useApp();
	const configuration = useQuery(
		api.web_push.configuration,
		Platform.OS === "web" ? {} : "skip",
	);
	const register = useMutation(api.web_push.register);
	useEffect(() => {
		if (!account.id || !configuration?.publicKey) return;
		const controller = { active: true };
		void restoreBrowserNotifications(configuration.publicKey)
			.then(async (registration): Promise<void> => {
				if (controller.active && registration) await register(registration);
			})
			.catch((): void => {});
		return (): void => {
			controller.active = false;
		};
	}, [account.id, configuration?.publicKey, register]);
	return undefined;
};
