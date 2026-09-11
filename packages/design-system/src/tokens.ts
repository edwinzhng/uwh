export const space = {
	none: 0,
	half: 2,
	xxs: 4,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
	xxxl: 64,
} as const;
export const radius = {
	none: 0,
	xs: 4,
	sm: 6,
	md: 8,
	lg: 12,
	xl: 16,
	xxl: 24,
	xxxl: 32,
	round: 9999,
} as const;
export const layer = {
	base: 0,
	raised: 1,
	selected: 2,
	sticky: 10,
	popover: 20,
	backdrop: 30,
	modal: 40,
	toast: 50,
	tooltip: 60,
} as const;
export const corners = {
	control: radius.sm,
	item: radius.sm,
	panel: radius.md,
	overlay: radius.lg,
	pill: radius.round,
} as const;
export const elevation = {
	none: { boxShadow: "none", elevation: 0 },
	raised: {
		boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 3px 8px rgba(0,0,0,0.04)",
		elevation: 1,
	},
	floating: { boxShadow: "0 4px 12px rgba(0,0,0,0.12)", elevation: 4 },
	overlay: { boxShadow: "0 12px 32px rgba(0,0,0,0.20)", elevation: 8 },
} as const;

export const opacity = { backdrop: 0.15 } as const;

export const motion = {
	duration: {
		instant: 0,
		fast: 120,
		reveal: 150,
		standard: 200,
		toggle: 220,
		slow: 280,
	},
	easing: {
		control: [0.25, 0.1, 0.25, 1],
		out: [0.23, 1, 0.32, 1],
		move: [0.77, 0, 0.175, 1],
		sheet: [0.32, 0.72, 0, 1],
	},
	pressScale: 0.97,
	settle: { duration: 400, dampingRatio: 1 },
} as const;

export const brand = {
	ink: "#021e00",
	accent: "#0d4ff7",
	surface: "#ffffff",
	font: "Degular, Arial, sans-serif",
} as const;

export const typography = {
	h1: { fontSize: 32, lineHeight: 38, letterSpacing: -0.7, family: "heading" },
	h2: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5, family: "heading" },
	h3: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, family: "heading" },
	h4: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, family: "heading" },
	body: { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: "regular" },
	small: { fontSize: 14, lineHeight: 20, letterSpacing: 0, family: "regular" },
	label: { fontSize: 14, lineHeight: 20, letterSpacing: 0, family: "medium" },
	field: { fontSize: 13, lineHeight: 18, letterSpacing: 0, family: "regular" },
	caption: {
		fontSize: 12,
		lineHeight: 18,
		letterSpacing: 0.1,
		family: "regular",
	},
	overline: {
		fontSize: 11,
		lineHeight: 16,
		letterSpacing: 1.5,
		family: "semibold",
	},
	number: { fontSize: 32, lineHeight: 40, letterSpacing: -1, family: "medium" },
} as const;

export type ColorScale = {
	subtle: string;
	muted: string;
	border: string;
	solid: string;
	text: string;
};

export type SemanticColorScales = Record<
	"accent" | "success" | "warning" | "danger" | "pending" | "coach" | "admin",
	ColorScale
>;

export const lightColorScales = {
	pending: {
		subtle: "#F5F3FF",
		muted: "#EDE9FE",
		border: "#C4B5FD",
		solid: "#7C3AED",
		text: "#5B21B6",
	},
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
		subtle: "#FFF7ED",
		muted: "#FFEDD5",
		border: "#FDBA74",
		solid: "#EA580C",
		text: "#C2410C",
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
	pending: {
		subtle: "#251D38",
		muted: "#35264F",
		border: "#7655A8",
		solid: "#A78BFA",
		text: "#DDD6FE",
	},
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
		subtle: "#321F14",
		muted: "#4A2D18",
		border: "#9A5424",
		solid: "#F97316",
		text: "#FDBA74",
	},
	danger: {
		subtle: "#321B1B",
		muted: "#4B2727",
		border: "#8C4949",
		solid: "#E56B6B",
		text: "#FCA5A5",
	},
} as const satisfies SemanticColorScales;

export const chartColors = {
	blue: "hsl(212, 100%, 48%)",
	red: "hsl(358, 75%, 59%)",
	amber: "hsl(39, 100%, 57%)",
	green: "hsl(131, 41%, 46%)",
	teal: "hsl(173, 80%, 36%)",
	purple: "hsl(272, 51%, 54%)",
	gray: "hsl(0, 0%, 56%)",
	pink: "hsl(336, 80%, 58%)",
} as const;
