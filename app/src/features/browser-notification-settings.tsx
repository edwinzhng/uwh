import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	browserNotificationStatus,
	disableBrowserNotifications,
	registerBrowserNotifications,
	watchBrowserNotifications,
} from "../backend/browser-push";
import { useBrowserInstall } from "../backend/use-browser-install";
import { Button, Row, Stack, Text } from "../design-system";
import { useFormTask } from "./use-form-task";

export const BrowserNotificationSettings = (): ReactElement => {
	const configuration = useQuery(api.web_push.configuration, {});
	const register = useMutation(api.web_push.register);
	const unregister = useMutation(api.web_push.unregister);
	const task = useFormTask();
	const install = useBrowserInstall();
	const [capability, setCapability] =
		useState<ReturnType<typeof browserNotificationStatus>>();
	const [status, setStatus] = useState<string>();
	useEffect(() => {
		const refresh = (): void => setCapability(browserNotificationStatus());
		refresh();
		return watchBrowserNotifications(refresh);
	}, []);
	return (
		<Stack gap="sm">
			<Text variant="small" tone="secondary">
				{configuration?.reason ??
					capability?.reason ??
					(capability?.permission === "denied"
						? "Notifications are blocked. Allow this site in browser settings, then enable again."
						: "Browser notification permissions are requested only when you enable them.")}
			</Text>
			<Text variant="caption" tone="secondary">
				{configuration?.devices ?? 0} registered browsers
			</Text>
			<Row wrap>
				<Button
					label="Enable in this browser"
					isDisabled={!configuration?.configured || !capability?.supported}
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							if (!configuration?.publicKey)
								throw new Error("Browser push is not configured.");
							await register(
								await registerBrowserNotifications(configuration.publicKey),
							);
							setCapability(browserNotificationStatus());
							setStatus("This browser is registered for notifications.");
						});
					}}
				/>
				<Button
					label="Disable in this browser"
					variant="ghost"
					isDisabled={task.busy || !capability?.supported}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							const installationId = await disableBrowserNotifications();
							if (installationId) await unregister({ installationId });
							setCapability(browserNotificationStatus());
							setStatus("This browser no longer receives push notifications.");
						});
					}}
				/>
			</Row>
			<Text variant="small" tone="secondary">
				{install.instructions}
			</Text>
			{install.available ? (
				<Button
					label="Install web app"
					variant="secondary"
					isDisabled={task.busy}
					onPress={(): void => {
						void task.run(install.install);
					}}
				/>
			) : undefined}
			{status ? (
				<Text variant="small" tone="secondary">
					{status}
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
