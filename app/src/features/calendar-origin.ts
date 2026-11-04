export const calendarOrigin =
	process.env.EXPO_PUBLIC_CALENDAR_ORIGIN ||
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL ||
	process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
		".convex.cloud",
		".convex.site",
	).replace(":3210", ":3211");
