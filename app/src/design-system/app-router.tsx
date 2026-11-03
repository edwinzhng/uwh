import { Stack } from "expo-router";
import type { ReactElement } from "react";

const pageNames: Record<string, string> = {
	index: "Schedule",
	member: "Profile",
	messages: "Chats",
	progress: "Progress",
	"auth-callback": "Sign in",
};

const pageTitle = (name: string): string =>
	`UWH Club | ${pageNames[name] ?? name.replaceAll("-", " ").replace(/^./, (letter): string => letter.toUpperCase())}`;

export const AppRouter = (): ReactElement => {
	return (
		<Stack
			screenOptions={({ route }) => ({
				title: pageTitle(route.name),
				headerShown: false,
				freezeOnBlur: true,
				animation: "none",
				contentStyle: { backgroundColor: "transparent" },
			})}
		/>
	);
};
