import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Button } from "../design-system";
import { AccountHousehold } from "./account-household";
import { AccountSettingsContent } from "./account-settings-screen";
import { ClubShell } from "./club-shell";
import { NotificationSettings } from "./notification-settings";
import { PreviewBrowserNotifications } from "./preview-browser-notifications";
import { useReviewFlow } from "./use-review-flow";

export const AccountPreferencesScreen = (): ReactElement => {
	const { section } = useLocalSearchParams<{ section?: string }>();
	const reviewFlow = useReviewFlow();
	const router = useRouter();
	const back = section ? (
		<Button
			label="Settings"
			prefix="arrowLeft"
			variant="ghost"
			onPress={(): void => router.replace("/account-settings")}
		/>
	) : undefined;
	if (
		section === "notifications" ||
		reviewFlow === "notification-settings" ||
		reviewFlow === "browser-notifications"
	)
		return (
			<ClubShell title="Notifications" back={back}>
				{reviewFlow === "browser-notifications" ? (
					<PreviewBrowserNotifications />
				) : (
					<NotificationSettings />
				)}
			</ClubShell>
		);
	return (
		<ClubShell
			title={section === "household" ? "Linked profiles" : "Settings"}
			back={back}
		>
			{section === "household" ? (
				<AccountHousehold />
			) : (
				<AccountSettingsContent />
			)}
		</ClubShell>
	);
};
