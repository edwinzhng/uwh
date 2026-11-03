import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { AccountHousehold } from "./account-household";
import { AccountSettingsContent } from "./account-settings-screen";
import { ClubShell } from "./club-shell";
import { NotificationSettings } from "./notification-settings";
import { PreviewBrowserNotifications } from "./preview-browser-notifications";
import { useReviewFlow } from "./use-review-flow";

export const AccountPreferencesScreen = (): ReactElement => {
	const { section } = useLocalSearchParams<{ section?: string }>();
	const reviewFlow = useReviewFlow();
	if (
		reviewFlow === "notification-settings" ||
		reviewFlow === "browser-notifications"
	)
		return (
			<ClubShell title="Settings">
				{reviewFlow === "browser-notifications" ? (
					<PreviewBrowserNotifications />
				) : (
					<NotificationSettings />
				)}
			</ClubShell>
		);
	return (
		<ClubShell title="Settings">
			{section === "household" ? (
				<>
					<AccountHousehold />
					<AccountSettingsContent />
				</>
			) : (
				<>
					<AccountSettingsContent />
					<AccountHousehold />
				</>
			)}
		</ClubShell>
	);
};
