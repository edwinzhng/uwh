import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";
import {
	disableNativePush,
	installationId,
	nativePushAvailable,
	openNotificationSettings,
	registerNativePush,
	setPushEnabled,
} from "../backend/native-push";
import { useApp } from "../demo/app-state";
import {
	actionToast,
	Button,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import { notificationPreferenceOptions } from "../domain/notification-preferences";
import { BrowserNotificationSettings } from "./browser-notification-settings";
import { PreviewNotificationSettings } from "./preview-notification-settings";
import { useTask } from "./use-task";

const LiveNotificationSettings = (): ReactElement => {
	const { account } = useApp();
	const settings = useQuery(api.notifications.settings, {});
	const preferences = useMutation(api.notifications.preferences);
	const register = useMutation(api.notifications.register);
	const unregister = useMutation(api.notifications.unregister);
	const [status, setStatus] = useState<string>();
	const task = useTask();
	return (
		<Stack gap="sm">
			<SectionHeading>Notifications</SectionHeading>
			<Surface>
				<Stack>
					{settings ? (
						<Stack gap="none">
							{notificationPreferenceOptions
								.filter(
									(item) =>
										!("staff" in item) ||
										account.admin ||
										account.coachPrograms.length > 0,
								)
								.map((item) => (
									<Toggle
										compact
										key={item.key}
										label={item.label}
										value={settings.preferences[item.key]}
										isDisabled={task.busy}
										onValueChange={(value): void => {
											void task.run(async (): Promise<void> => {
												await preferences({
													kind: item.key,
													enabled: value,
												});
												actionToast("savedNotifications", "success", {
													subject: item.label,
													description: `${item.label} · ${value ? "On" : "Off"}`,
												});
											});
										}}
									/>
								))}
							<Text variant="caption" tone="secondary">
								{settings.devices} registered{" "}
								{settings.devices === 1 ? "device" : "devices"}
							</Text>
						</Stack>
					) : undefined}
					{Platform.OS === "web" ? (
						<BrowserNotificationSettings />
					) : nativePushAvailable ? (
						<Row wrap>
							<Button
								label="Enable on this device"
								isLoading={task.busy}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										const registration = await registerNativePush(true);
										if (registration) {
											await register(registration);
											await setPushEnabled(true);
											setStatus("Notifications enabled.");
											actionToast("enabledNotifications");
										}
									});
								}}
							/>
							<Button
								label="Disable on this device"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										await disableNativePush();
										await unregister({
											installationId: await installationId(),
										});
										setStatus("Notifications disabled.");
										actionToast("disabledNotifications");
									});
								}}
							/>
							<Button
								label="Device settings"
								variant="ghost"
								onPress={(): void => {
									void openNotificationSettings();
								}}
							/>
						</Row>
					) : (
						<Text variant="small" tone="secondary">
							Enable push in the iOS or Android app.
						</Text>
					)}
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
			</Surface>
		</Stack>
	);
};
export const NotificationSettings = (): ReactElement =>
	useApp().source === "convex" ? (
		<LiveNotificationSettings />
	) : (
		<PreviewNotificationSettings />
	);
