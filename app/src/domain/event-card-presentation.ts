import { formatTime } from "./app-rules";

export const eventTimeRange = (start: string, end: string): string => {
	const from = formatTime(start).replace(":00", "");
	const to = formatTime(end).replace(":00", "");
	return `${from.endsWith("AM") === to.endsWith("AM") ? from.replace(/ (AM|PM)$/, "") : from}–${to}`
		.replace(/\s/g, "")
		.toLowerCase();
};

export const eventDateParts = (
	date: string,
): {
	weekday: string;
	day: string;
	month: string;
} => {
	const value = new Date(`${date}T12:00:00Z`);
	const format = (options: Intl.DateTimeFormatOptions): string =>
		new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
			value,
		);
	return {
		weekday: format({ weekday: "short" }),
		day: format({ day: "numeric" }),
		month: format({ month: "short" }),
	};
};
