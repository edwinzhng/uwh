import { useRouter } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import clubLogo from "../../assets/club-logo.png";
import { useApp } from "../demo/app-state";
import {
	AppLayout,
	Badge,
	Button,
	Dialog,
	IconButton,
	ListItem,
	LoadingContent,
	PageReveal,
	Row,
	Stack,
	Text,
} from "../design-system";
import { FamilyMenu } from "./family-menu";
import { useClubNavigation } from "./use-club-navigation";

type Props = {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	action?: ReactNode;
	back?: ReactNode;
	staffRole?: "coach" | "admin";
	footer?: ReactNode;
	scrollable?: boolean;
};
export const ClubShell = ({
	children,
	title,
	subtitle,
	action,
	back,
	staffRole,
	footer,
	scrollable,
}: Props): ReactElement => {
	const navigation = useClubNavigation();
	const router = useRouter();
	const { data, account, error, clearError, loading } = useApp();
	const [notifications, setNotifications] = useState(false);
	const unread = data.notices.filter(
		(entry) => !entry.acknowledgedBy.includes(account.id),
	);
	return (
		<AppLayout
			brand={data.clubName}
			onBrandPress={(): void => router.navigate("/club")}
			brandLogo={data.clubName === "Calgary Crocs" ? clubLogo : undefined}
			title={title}
			subtitle={subtitle}
			action={action}
			titleAccessory={
				staffRole ? (
					<Badge
						label={staffRole === "admin" ? "Admin" : "Coach"}
						kind={staffRole}
					/>
				) : undefined
			}
			back={back}
			footer={footer}
			scrollable={scrollable}
			profile={<FamilyMenu />}
			accessory={
				<IconButton
					label={
						"Notifications" +
						(unread.length ? ` · ${unread.length} recent unread` : "")
					}
					icon="bell"
					onPress={(): void => setNotifications(true)}
				/>
			}
			navigation={navigation}
		>
			{error ? (
				<Row justify="between" wrap>
					<Text variant="small" tone="danger">
						{error}
					</Text>
					<Button label="Dismiss" variant="ghost" onPress={clearError} />
				</Row>
			) : undefined}
			{loading ? (
				<LoadingContent />
			) : (
				<PageReveal fill={scrollable === false}>{children}</PageReveal>
			)}
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
				<Stack>
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
						<Text tone="secondary">No unread recent announcements.</Text>
					)}
				</Stack>
			</Dialog>
		</AppLayout>
	);
};
