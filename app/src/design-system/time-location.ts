export const formatTimeLocation = (time: string, location: string): string =>
	[time, location].filter(Boolean).join(" · ");
