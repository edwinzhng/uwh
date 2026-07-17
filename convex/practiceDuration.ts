const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Edmonton",
	weekday: "short",
});

export const COACHING_DURATION_OPTIONS = [
	{ label: "1 hour", durationMinutes: 60 },
	{ label: "1.5 hours", durationMinutes: 90 },
	{ label: "2 hours", durationMinutes: 120 },
	{ label: "2.5 hours", durationMinutes: 150 },
	{ label: "3 hours", durationMinutes: 180 },
] as const satisfies readonly {
	label: string;
	durationMinutes: number;
}[];

export const isCoachingDurationMinutes = (durationMinutes: number): boolean =>
	COACHING_DURATION_OPTIONS.some(
		(option) => option.durationMinutes === durationMinutes,
	);

export const getDefaultPracticeDurationMinutes = (
	practiceDate: number,
): number => {
	const weekday = weekdayFormatter.format(practiceDate);
	return weekday === "Fri" ? 60 : 90;
};
