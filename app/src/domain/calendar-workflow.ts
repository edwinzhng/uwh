export type CalendarView = "choose" | "subscribe" | "download";

export const calendarViewAfterScopeChange = (
	previous: CalendarView,
): CalendarView => (previous === "subscribe" ? "choose" : previous);

export const calendarViewTitle = (view: CalendarView): string =>
	({
		choose: "Add to calendar",
		subscribe: "Automatic updates",
		download: "Download calendar",
	})[view];

export const calendarScopeLabel = (
	people: readonly { name: string }[],
): string =>
	people.length
		? people.map((person) => person.name).join(", ")
		: "Choose at least one person";

export const googleCalendarSubscriptionUrl = (feedUrl: string): string =>
	`https://calendar.google.com/calendar/u/0/r?${new URLSearchParams({ cid: feedUrl })}`;

export const appleCalendarSubscriptionUrl = (feedUrl: string): string =>
	feedUrl.replace(/^https?:/, "webcal:");
