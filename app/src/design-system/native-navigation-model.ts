import { isPrimaryDestination, pagePathname } from "../domain/page-navigation";

const headerlessRoutes = [
	"(tabs)",
	"join",
	"auth-callback",
	"review-auth",
	"otp-test",
];

export const nativeHeaderRoute = (name: string): boolean =>
	Boolean(name) &&
	!isPrimaryDestination(pagePathname(name)) &&
	!headerlessRoutes.includes(name);

const routeTitles: Record<string, string> = {
	"(tabs)": "Home",
	member: "Profile",
	"my-progress": "Progress",
	"account-settings": "Account settings",
	"club-information": "Club information",
	"coaching-hours": "Coaching hours",
	"attendance-report": "Attendance",
};

export const nativeRouteTitle = (name: string): string =>
	routeTitles[name] ??
	name
		.replaceAll("-", " ")
		.replace(/^./, (letter): string => letter.toUpperCase());

export const nativeTabsComponents = (platform: string): readonly string[] =>
	platform === "ios"
		? ["RNSTabsHostIOS", "RNSTabsScreenIOS"]
		: platform === "android"
			? ["RNSTabsHostAndroid", "RNSTabsScreenAndroid"]
			: [];
