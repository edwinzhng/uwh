export type ColorScale = {
	subtle: string;
	muted: string;
	border: string;
	solid: string;
	text: string;
};

export type SemanticColorScales = Record<
	"accent" | "success" | "warning" | "danger" | "coach" | "admin",
	ColorScale
>;

export const lightColorScales = {
	coach: {
		subtle: "#F5F0FF",
		muted: "#EDE2FF",
		border: "#CEB5F3",
		solid: "#7C3AED",
		text: "#6431A8",
	},
	admin: {
		subtle: "#FFFAE6",
		muted: "#FFF0BC",
		border: "#E6CB71",
		solid: "#B9800A",
		text: "#805B05",
	},
	accent: {
		subtle: "#F0F4FF",
		muted: "#DFE8FF",
		border: "#ADC3FF",
		solid: "#0D4FF7",
		text: "#093CBF",
	},
	success: {
		subtle: "#ECFDF3",
		muted: "#D1FADE",
		border: "#86D6A0",
		solid: "#228346",
		text: "#166534",
	},
	warning: {
		subtle: "#FFFBEB",
		muted: "#FEF0C7",
		border: "#EBC572",
		solid: "#AD6A10",
		text: "#92400E",
	},
	danger: {
		subtle: "#FEF2F2",
		muted: "#FEE2E2",
		border: "#F2A5A5",
		solid: "#DC2626",
		text: "#B91C1C",
	},
} as const satisfies SemanticColorScales;

export const darkColorScales = {
	coach: {
		subtle: "#291D3B",
		muted: "#38264E",
		border: "#74529E",
		solid: "#B28AF6",
		text: "#D6BBFF",
	},
	admin: {
		subtle: "#302915",
		muted: "#44381B",
		border: "#826B2C",
		solid: "#D9B647",
		text: "#F3D77F",
	},
	accent: {
		subtle: "#141E36",
		muted: "#1B2D55",
		border: "#345598",
		solid: "#0D4FF7",
		text: "#ADC3FF",
	},
	success: {
		subtle: "#14291C",
		muted: "#1D3A28",
		border: "#316E47",
		solid: "#4DBD73",
		text: "#86EFAC",
	},
	warning: {
		subtle: "#302414",
		muted: "#493419",
		border: "#86622D",
		solid: "#DFA63C",
		text: "#FCD34D",
	},
	danger: {
		subtle: "#321B1B",
		muted: "#4B2727",
		border: "#8C4949",
		solid: "#E56B6B",
		text: "#FCA5A5",
	},
} as const satisfies SemanticColorScales;
