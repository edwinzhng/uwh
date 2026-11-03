const primaryDestinations = [
	"/",
	"/schedule",
	"/messages",
	"/account",
	"/club",
];

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
