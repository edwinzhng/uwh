const pad = (value: number): string => String(value).padStart(2, "0");

export const dateToValue = (date: Date): string =>
	`${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const dateFromValue = (value?: string): Date | undefined => {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
	if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31)
		return undefined;
	const date = new Date(0);
	date.setFullYear(year, month - 1, day);
	date.setHours(12, 0, 0, 0);
	return dateToValue(date) === value ? date : undefined;
};

export const relativeDate = (offset: number, from = new Date()): string => {
	const date = new Date(from);
	date.setHours(12, 0, 0, 0);
	date.setDate(date.getDate() + offset);
	return dateToValue(date);
};

export const parseDate = (
	input: string,
	today = new Date(),
): string | undefined => {
	const text = input.trim().toLowerCase();
	if (text === "today") return relativeDate(0, today);
	if (text === "tomorrow") return relativeDate(1, today);
	return dateFromValue(text) ? text : undefined;
};

export const isDateAllowed = (
	value: string,
	min?: string,
	max?: string,
): boolean =>
	Boolean(dateFromValue(value)) &&
	(!min || value >= min) &&
	(!max || value <= max);

export const formatDate = (value?: string): string => {
	const date = dateFromValue(value);
	return date
		? new Intl.DateTimeFormat("en-CA", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}).format(date)
		: "Choose date";
};

export const parseTime = (input: string): string | undefined => {
	const match = input
		.trim()
		.toLowerCase()
		.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap](?:m)?)?$/);
	if (!match) return undefined;
	const hour = Number(match.at(1));
	const minute = Number(match.at(2) ?? 0);
	const period = match.at(3)?.at(0);
	if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23))
		return undefined;
	const normalizedHour = period
		? (hour % 12) + (period === "p" ? 12 : 0)
		: hour;
	return `${pad(normalizedHour)}:${pad(minute)}`;
};

export const formatTime = (value?: string): string => {
	const time = value ? parseTime(value) : undefined;
	if (!time) return "";
	const [hour = 0, minute = 0] = time.split(":").map(Number);
	return `${hour % 12 || 12}:${pad(minute)} ${hour >= 12 ? "PM" : "AM"}`;
};

export const timeFromDate = (date: Date): string =>
	`${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const timeToDate = (value?: string): Date => {
	const [hour = 12, minute = 0] = (
		value ? (parseTime(value) ?? "12:00") : "12:00"
	)
		.split(":")
		.map(Number);
	return new Date(2000, 0, 1, hour, minute);
};

export const timeSuggestions = Array.from({ length: 96 }, (_, index) => {
	const value = `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`;
	return { value, label: formatTime(value) };
});
