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
			label: "Home",
			icon: "home",
			selected: path === "/",
			onPress: (): void => router.navigate("/"),
		},
		{
			label: "Schedule",
			icon: "calendar",
			selected: ["/schedule", "/session", "/series"].includes(path),
			onPress: (): void => router.navigate("/schedule"),
		},
		{
			label: "Messages",
			icon: "message",
			badge: unread,
			selected: ["/messages", "/conversation"].includes(path),
			onPress: (): void => router.navigate("/messages"),
		},
		{
			label: "Account",
			icon: "users",
			selected: [
				"/account",
				"/account-settings",
				"/membership",
				"/my-progress",
				"/delete-account",
				"/connect-account",
			].includes(path),
			onPress: (): void => router.navigate("/account"),
		},
		{
			label: "Club",
			icon: "shield",
			selected: [
				"/club",
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
