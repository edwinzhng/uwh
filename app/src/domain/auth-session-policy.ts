const day = 24 * 60 * 60 * 1000;

export const authSessionPolicy = {
	totalDurationMs: 365 * day,
	inactiveDurationMs: 90 * day,
} as const;
