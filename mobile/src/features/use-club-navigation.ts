import { usePathname, useRouter } from "expo-router";
import { useMessaging } from "../backend/messaging-context";
import type { NavigationItem } from "../design-system";

export const useClubNavigation = (): NavigationItem[] => {
	const path = usePathname();
	const router = useRouter();
	const unread = useMessaging().threads.filter(
		(thread) => thread.unread > 0,
	).length;
	return [
		{
			label: "Schedule",
			icon: "calendar",
			selected: ["/", "/schedule", "/session"].includes(path),
			onPress: (): void => router.navigate("/schedule"),
		},
		{
			label: "Messages",
			badge: unread,
			icon: "message",
			selected: ["/messages", "/conversation"].includes(path),
			onPress: (): void => router.navigate("/messages"),
		},
		{
			label: "Members",
			icon: "users",
			selected: ["/members", "/member", "/progress"].includes(path),
			onPress: (): void => router.navigate("/members"),
		},
		{
			label: "Club",
			icon: "shield",
			selected: [
				"/club",
				"/administration",
				"/equipment",
				"/settings",
				"/moderation",
				"/coaching-hours",
				"/fitness",
				"/attendance-report",
			].includes(path),
			onPress: (): void => router.navigate("/club"),
		},
	];
};
