import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
	disableNativePush,
	installationId,
	nativePushAvailable,
	openNotificationSettings,
	registerNativePush,
	setPushEnabled,
} from "../backend/native-push";
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
import { useTask } from "./use-task";

export const NotificationSettings = (): ReactElement => {
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
							{(
								[
									{ key: "messages", label: "Messages" },
									{ key: "announcements", label: "Announcements" },
									{ key: "events", label: "Registration reminders" },
									{ key: "feedback", label: "Coaching feedback" },
								] as const
							).map((item) => (
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
											actionToast("savedNotifications");
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
					{nativePushAvailable ? (
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
