const utcDate = (value: string): Date => new Date(`${value}T12:00:00Z`);
const dateValue = (date: Date): string => date.toISOString().slice(0, 10);
export const moveCalendarDate = (value: string, days: number): string =>
	dateValue(new Date(utcDate(value).getTime() + days * 86400000));
export const moveCalendarMonth = (value: string, months: number): string => {
	const date = utcDate(value);
	const end = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0, 12),
	);
	return dateValue(
		new Date(
			Date.UTC(
				end.getUTCFullYear(),
				end.getUTCMonth(),
				Math.min(date.getUTCDate(), end.getUTCDate()),
				12,
			),
		),
	);
};
export const calendarDays = (value: string): string[] => {
	const first = `${value.slice(0, 7)}-01`;
	const mondayOffset = (utcDate(first).getUTCDay() + 6) % 7;
	const date = utcDate(value);
	const daysInMonth = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
	).getUTCDate();
	return Array.from(
		{ length: Math.ceil((mondayOffset + daysInMonth) / 7) * 7 },
		(_, index) => moveCalendarDate(first, index - mondayOffset),
	);
};
export const calendarKeyDate = (
	value: string,
	key: string,
): string | undefined => {
	const weekday = (utcDate(value).getUTCDay() + 6) % 7;
	switch (key) {
		case "ArrowLeft":
			return moveCalendarDate(value, -1);
		case "ArrowRight":
			return moveCalendarDate(value, 1);
		case "ArrowUp":
			return moveCalendarDate(value, -7);
		case "ArrowDown":
			return moveCalendarDate(value, 7);
		case "Home":
			return moveCalendarDate(value, -weekday);
		case "End":
			return moveCalendarDate(value, 6 - weekday);
		case "PageUp":
			return moveCalendarMonth(value, -1);
		case "PageDown":
			return moveCalendarMonth(value, 1);
		default:
			return undefined;
	}
};
