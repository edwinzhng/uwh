export const motionDurations = {
	instant: 0,
	fast: 150,
	standard: 200,
	slow: 300,
	extended: 500,
} as const;

export const motionEffects = {
	liquidRelease: 1000,
	heroCopyReveal: 1500,
	heroActionDelay: 700,
} as const;

export type MotionDurationToken = keyof typeof motionDurations;
export type MotionEasingToken = keyof typeof motionEasings;

export const motionEasings = {
	standard: [0.25, 0.1, 0.25, 1],
	out: [0.23, 1, 0.32, 1],
	"in-out": [0.77, 0, 0.175, 1],
	emphasized: [0.32, 0.72, 0, 1],
	linear: [0, 0, 1, 1],
} satisfies Record<string, [number, number, number, number]>;

export const motionEasingCss = (token: MotionEasingToken): string =>
	`cubic-bezier(${motionEasings[token].join(", ")})`;

export const motionDurationSeconds = (token: MotionDurationToken): number =>
	motionDurations[token] / 1000;
