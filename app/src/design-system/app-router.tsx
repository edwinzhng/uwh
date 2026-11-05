import { Stack } from "expo-router";
import type { ReactElement } from "react";
import type { AppRouterProps } from "./app-router-props";
import { useTheme } from "./theme";

const pageNames: Record<string, string> = {
	index: "Schedule",
	member: "Profile",
	messages: "Chats",
	progress: "Progress",
	"auth-callback": "Sign in",
};

const pageTitle = (name: string): string =>
	`UWH Club | ${pageNames[name] ?? name.replaceAll("-", " ").replace(/^./, (letter): string => letter.toUpperCase())}`;

export const AppRouter = ({ renderScreen }: AppRouterProps): ReactElement => {
	const theme = useTheme();
	return (
		<Stack
			screenLayout={
				renderScreen
					? ({ route, children }): ReactElement =>
							renderScreen(route.name, { ...route.params }, children)
					: undefined
			}
			screenOptions={({ route }) => ({
				title: pageTitle(route.name),
				headerShown: false,
				freezeOnBlur: true,
				animation: "none",
				contentStyle: { backgroundColor: theme.background.canvas },
			})}
		/>
	);
};
