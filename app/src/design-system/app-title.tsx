import { usePathname } from "expo-router";
import Head from "expo-router/head";
import type { ReactElement } from "react";
import { Platform } from "react-native";

const pageNames: Record<string, string> = {
	"": "Home",
	member: "Profile",
	"auth-callback": "Sign in",
};

export const AppTitle = (): ReactElement | undefined => {
	const pathname = usePathname();
	if (Platform.OS !== "web") return undefined;
	const route = pathname.split("/").filter(Boolean).at(0) ?? "";
	const name =
		pageNames[route] ??
		route
			.replaceAll("-", " ")
			.replace(/^./, (letter): string => letter.toUpperCase());
	return (
		<Head>
			<title>{`Crocs UWH | ${name}`}</title>
		</Head>
	);
};
