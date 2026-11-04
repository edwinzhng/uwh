export const formatTimeLocation = (time: string, location: string): string =>
	[time, location].filter(Boolean).join(" · ");

export const wrappingMetadata = (parts: readonly string[]): string =>
	parts
		.filter(Boolean)
		.map((part) => part.replace(/ (AM|PM)\b/g, "\u00a0$1"))
		.join("\u00a0· ");
