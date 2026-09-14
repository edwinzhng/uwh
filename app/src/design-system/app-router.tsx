import { Stack } from "expo-router";
import type { ReactElement } from "react";
import { useTheme } from "./theme";

const pageNames: Record<string, string> = {
	index: "Schedule",
	member: "Profile",
	progress: "Progress",
	"auth-callback": "Sign in",
};

const pageTitle = (name: string): string =>
	`UWH Club | ${pageNames[name] ?? name.replaceAll("-", " ").replace(/^./, (letter): string => letter.toUpperCase())}`;

export const AppRouter = (): ReactElement => {
	const theme = useTheme();
	return (
		<Stack
			screenOptions={({ route }) => ({
				title: pageTitle(route.name),
				headerShown: false,
				animation: "none",
				contentStyle: { backgroundColor: theme.background.primary },
			})}
		/>
	);
};
