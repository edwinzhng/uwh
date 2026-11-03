import { type ReactElement, useEffect, useState } from "react";
import { browserNotificationStatus } from "../backend/browser-push";
import { useBrowserInstall } from "../backend/use-browser-install";
import { Button, SectionHeading, Stack, Surface, Text } from "../design-system";
import { useFormTask } from "./use-form-task";

export const PreviewBrowserNotifications = (): ReactElement => {
	const install = useBrowserInstall();
	const task = useFormTask();
	const [capability, setCapability] =
		useState<ReturnType<typeof browserNotificationStatus>>();
	useEffect((): void => setCapability(browserNotificationStatus()), []);
	return (
		<Stack gap="sm">
			<SectionHeading>Browser notifications</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="small" tone="secondary">
						{capability?.reason ??
							"This browser supports notifications. Connect your account to check the club’s delivery configuration."}
					</Text>
					<Text variant="small" tone="secondary">
						Sign in to manage browser notifications. You can always find updates
						in your activity inbox.
					</Text>
					<Text variant="small" tone="secondary">
						{install.instructions}
					</Text>
					{install.available ? (
						<Button
							label="Install web app"
							variant="secondary"
							isLoading={task.busy}
							onPress={(): void => {
								void task.run(install.install);
							}}
						/>
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
