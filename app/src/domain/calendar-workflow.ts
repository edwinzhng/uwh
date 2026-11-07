export const googleCalendarSubscriptionUrl = (feedUrl: string): string =>
	`https://calendar.google.com/calendar/u/0/r?${new URLSearchParams({ cid: feedUrl })}`;

export const appleCalendarSubscriptionUrl = (feedUrl: string): string =>
	feedUrl.replace(/^https?:/, "webcal:");
