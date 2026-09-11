import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	List,
	ListItem,
	NotificationBell,
} from "../design-system";
export const NotificationsMenu = ({
	labeled = false,
}: {
	labeled?: boolean;
}): ReactElement => {
	const router = useRouter();
	const { data, account } = useApp();
	const [notifications, setNotifications] = useState(false);
	const unread = data.notices.filter(
		(entry) => !entry.acknowledgedBy.includes(account.id),
	);
	return (
		<>
			<NotificationBell
				label={labeled ? "Notifications" : undefined}
				count={unread.length}
				onPress={(): void => setNotifications(true)}
			/>
			<Dialog
				title="Recent announcements"
				isOpen={notifications}
				onOpenChange={setNotifications}
				footer={
					<Button
						label="All announcements"
						variant="secondary"
						onPress={(): void => {
							setNotifications(false);
							router.navigate({
								pathname: "/messages",
								params: { tab: "notices" },
							});
						}}
					/>
				}
			>
				<List>
					{unread.length ? (
						unread.map((entry) => (
							<ListItem
								key={entry.id}
								title={entry.title}
								description={entry.date}
								trailing={<Badge label="New" />}
								onPress={(): void => {
									setNotifications(false);
									router.navigate({
										pathname: "/messages",
										params: { tab: "notices" },
									});
								}}
							/>
						))
					) : (
						<EmptyState
							title="You’re all caught up"
							description="New announcements will appear here."
						/>
					)}
				</List>
			</Dialog>
		</>
	);
};
