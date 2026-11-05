const compactTime = (time: string): { clock: string; period: string } => {
	const [hour, minute] = time.split(":");
	const hours = Number(hour);
	return {
		clock: `${hours % 12 || 12}${minute === "00" ? "" : `:${minute}`}`,
		period: hours < 12 ? "am" : "pm",
	};
};

export const eventTimeRange = (start: string, end: string): string => {
	const from = compactTime(start);
	const to = compactTime(end);
	return `${from.clock}${from.period === to.period ? "" : from.period}–${to.clock}${to.period}`;
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
