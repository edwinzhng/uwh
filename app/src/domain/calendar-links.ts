export const calendarFeedUrl = (origin: string, token: string): string =>
	`${origin.replace(/\/$/, "")}/calendar.ics?${new URLSearchParams({ token })}`;
export const isHostedCalendarOrigin = (origin: string | undefined): boolean => {
	if (!origin) return false;
	try {
		const url = new URL(origin);
		return (
			url.protocol === "https:" &&
			url.hostname.includes(".") &&
			!/^[\d.]+$/.test(url.hostname) &&
			!/(^|\.)(localhost|local|internal|test|example|invalid)$/.test(
				url.hostname,
			)
		);
	} catch {
		return false;
	}
};
export const clubAppOrigin = "https://app.calgaryuwh.com";

export const hostedCalendarOrigin = (origin?: string): string | undefined =>
	origin?.replace(/\/$/, "") === "https://brainy-albatross-874.convex.site"
		? clubAppOrigin
		: origin;
