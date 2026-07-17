const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Edmonton",
	weekday: "short",
});

export const getDefaultPracticeDurationMinutes = (
	practiceDate: number,
): number => {
	const weekday = weekdayFormatter.format(practiceDate);
	return weekday === "Fri" ? 60 : 90;
};
