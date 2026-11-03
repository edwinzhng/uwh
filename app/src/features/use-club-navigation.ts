import { usePathname, useRouter } from "expo-router";
import { useMessaging } from "../backend/messaging-context";
import type { NavigationItem } from "../design-system";
import { isAccountDestination } from "../domain/page-navigation";

export const useClubNavigation = (): NavigationItem[] => {
	const path = usePathname();
	const router = useRouter();
	const unread = useMessaging().threads.filter(
		(thread) => thread.unread > 0,
	).length;
	return [
		{
			label: "Home",
			icon: "home",
			selected: ["/", "/announcements", "/shoutouts"].includes(path),
			onPress: (): void => router.navigate("/"),
		},
		{
			label: "Schedule",
			icon: "calendar",
			selected: ["/schedule", "/session", "/series"].includes(path),
			onPress: (): void => router.navigate("/schedule"),
		},
		{
			label: "Chats",
			icon: "message",
			badge: unread,
			selected: ["/messages", "/conversation"].includes(path),
			onPress: (): void => router.navigate("/messages"),
		},
		{
			label: "Account",
			showOnPhone: false,
			icon: "users",
			selected: isAccountDestination(path),
			onPress: (): void => router.navigate("/account"),
		},
		{
			label: "Club",
			icon: "shield",
			selected: [
				"/club",
				"/programs",
				"/program",
				"/resources",
				"/development",
				"/members",
				"/member",
				"/progress",
				"/club-information",
				"/administration",
				"/registration",
				"/payments",
				"/equipment",
				"/settings",
				"/moderation",
				"/coaching-hours",
				"/fitness",
				"/attendance-report",
				"/import",
			].includes(path),
			onPress: (): void => router.navigate("/club"),
		},
	];
};
