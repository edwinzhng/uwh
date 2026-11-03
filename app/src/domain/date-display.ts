export const displayDate = (
	value: string | number | Date,
	timeZone = "UTC",
): string => {
	const calendarDate =
		typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
	const date =
		value instanceof Date
			? value
			: new Date(calendarDate ? `${value}T12:00:00Z` : value);
	if (!Number.isFinite(date.getTime())) return "—";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: calendarDate ? "UTC" : timeZone,
	}).format(date);
};

export const displayDateTime = (value: number, timeZone?: string): string =>
	`${displayDate(value, timeZone)} · ${new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: timeZone ?? "UTC",
	}).format(value)}`;
