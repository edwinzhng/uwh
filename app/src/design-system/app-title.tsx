import { usePathname } from "expo-router";
import Head from "expo-router/head";
import type { ReactElement } from "react";
import { Platform } from "react-native";
import { useTheme } from "./theme";

const pageNames: Record<string, string> = {
	"": "Home",
	member: "Profile",
	messages: "Chats",
	"auth-callback": "Sign in",
};

export const AppTitle = (): ReactElement | undefined => {
	const pathname = usePathname();
	const theme = useTheme();
	if (Platform.OS !== "web") return undefined;
	const route = pathname.split("/").filter(Boolean).at(0) ?? "";
	const name =
		pageNames[route] ??
		route
			.replaceAll("-", " ")
			.replace(/^./, (letter): string => letter.toUpperCase());
	return (
		<Head>
			<meta name="theme-color" content={theme.background.canvas} />
			<meta name="color-scheme" content={theme.mode} />
			<title>{`UWH Club | ${name}`}</title>
		</Head>
	);
};
