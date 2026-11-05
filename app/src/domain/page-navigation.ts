const primaryDestinations = [
	"/",
	"/schedule",
	"/messages",
	"/account",
	"/club",
];

export const pageContentKey = (
	route: string,
	params: Record<string, string | string[] | undefined>,
): string =>
	JSON.stringify([
		route,
		...["id", "event", "person"].map((key) => params[key] ?? ""),
	]);

export const pagePathname = (routeName: string): string =>
	routeName === "index" || routeName === "(tabs)" ? "/" : `/${routeName}`;

export const isPrimaryDestination = (pathname: string): boolean =>
	primaryDestinations.includes(pathname);

export const isAccountDestination = (pathname: string): boolean =>
	[
		"/account",
		"/account-settings",
		"/membership",
		"/my-progress",
		"/delete-account",
		"/connect-account",
	].includes(pathname);

export const pageRoleTone = (
	pathname: string,
): "coach" | "admin" | undefined =>
	["/development", "/coaching-hours", "/attendance-report"].includes(pathname)
		? "coach"
		: [
					"/registration",
					"/payments",
					"/settings",
					"/moderation",
					"/import",
					"/equipment",
					"/invites",
				].includes(pathname)
			? "admin"
			: undefined;
