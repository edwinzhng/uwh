export const trialDates = (now = new Date()): string[] => {
	const today = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Edmonton",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
	const start = new Date(`${today}T12:00:00Z`);
	const end = new Date(
		Date.UTC(
			start.getUTCFullYear(),
			start.getUTCMonth() + 2,
			Math.min(
				start.getUTCDate(),
				new Date(
					Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0),
				).getUTCDate(),
			),
			12,
		),
	);
	return Array.from(
		{ length: 63 },
		(_, offset) => new Date(start.getTime() + offset * 86400000),
	)
		.filter((date) => date.getUTCDay() === 0 && date <= end)
		.map((date) => date.toISOString().slice(0, 10));
};

export const trialDateLabel = (date: string): string =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "UTC",
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date(`${date}T12:00:00Z`));
