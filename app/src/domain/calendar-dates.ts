export const addDays = (date: string, days: number): string =>
	new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
		.toISOString()
		.slice(0, 10);
export const validDate = (date: string): boolean =>
	/^\d{4}-\d{2}-\d{2}$/.test(date) &&
	!Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
	new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
