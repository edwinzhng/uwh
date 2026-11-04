import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { previewNotificationPreferences } from "../demo/notification-preferences-state";
import { Stack, Surface, Toggle } from "../design-system";
import {
	defaultNotificationPreferences,
	notificationPreferenceOptions,
} from "../domain/notification-preferences";

export const PreviewNotificationSettings = (): ReactElement => {
	const { account } = useApp();
	const [stored, setStored] = useAtom(previewNotificationPreferences);
	const preferences = stored[account.id] ?? defaultNotificationPreferences;
	return (
		<Stack gap="sm">
			<Surface>
				<Stack>
					{notificationPreferenceOptions
						.filter(
							(item) =>
								!("staff" in item) ||
								account.admin ||
								account.coachPrograms.length > 0,
						)
						.map((item) => (
							<Toggle
								key={item.key}
								compact
								label={item.label}
								value={preferences[item.key]}
								onValueChange={(enabled): void =>
									setStored((previous) => ({
										...previous,
										[account.id]: {
											...(previous[account.id] ??
												defaultNotificationPreferences),
											[item.key]: enabled,
										},
									}))
								}
							/>
						))}
				</Stack>
			</Surface>
		</Stack>
	);
};
