import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Dialog,
	EmptyState,
	List,
	ListItem,
	NotificationBell,
} from "../design-system";
import { memberName } from "../domain/app-rules";

export const NotificationsMenu = ({
	labeled = false,
}: {
	labeled?: boolean;
}): ReactElement => {
	const router = useRouter();
	const { data, account } = useApp();
	const [notifications, setNotifications] = useState(false);
	const personIds = [account.personId, ...account.children];
	const recent = data.feedback
		.filter(
			(entry) =>
				entry.visibility === "published" && personIds.includes(entry.personId),
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 5);
	return (
		<>
			<NotificationBell
				label={labeled ? "Notifications" : undefined}
				count={0}
				onPress={(): void => setNotifications(true)}
			/>
			<Dialog
				title="Notifications"
				isOpen={notifications}
				onOpenChange={setNotifications}
			>
				<List>
					{recent.length ? (
						recent.map((entry) => (
							<ListItem
								key={entry.id}
								title={memberName(data, entry.personId)}
								description={entry.body}
								onPress={(): void => {
									setNotifications(false);
									router.push({
										pathname: "/member",
										params: { id: entry.personId, tab: "shoutouts" },
									});
								}}
							/>
						))
					) : (
						<EmptyState
							title="No notifications"
							description="You’re all caught up."
						/>
					)}
				</List>
			</Dialog>
		</>
	);
};
