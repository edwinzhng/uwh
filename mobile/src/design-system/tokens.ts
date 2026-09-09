import {
	darkColorScales,
	lightColorScales,
	type SemanticColorScales,
} from "./color-scales";

export const palette = {
	moss: "#021E00",
	pine: "#033300",
	accent: lightColorScales.accent.solid,
	black: "#000000",
	white: "#FFFFFF",
} as const;

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
	raised: { boxShadow: "0 1px 2px rgba(0,0,0,0.05)", elevation: 1 },
	floating: { boxShadow: "0 4px 12px rgba(0,0,0,0.12)", elevation: 4 },
	overlay: { boxShadow: "0 12px 32px rgba(0,0,0,0.20)", elevation: 8 },
} as const;

export const opacity = { backdrop: 0.15 } as const;

export const motion = {
	duration: { instant: 0, fast: 120, standard: 200, toggle: 220, slow: 280 },
	easing: {
		control: [0.25, 0.1, 0.25, 1],
		out: [0.23, 1, 0.32, 1],
		move: [0.77, 0, 0.175, 1],
		sheet: [0.32, 0.72, 0, 1],
	},
	pressScale: 0.97,
	settle: { duration: 400, dampingRatio: 1 },
} as const;

export const font = {
	heading: "Inter_600SemiBold",
	regular: "Inter_400Regular",
	medium: "Inter_500Medium",
	semibold: "Inter_600SemiBold",
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

export const geometry = {
	chart: 220,
	border: 1,
	focus: 2,
	touch: 44,
	control: 44,
	compactControl: 32,
	calendarDay: 36,
	popupWidth: 224,
	popupMaxHeight: 320,
	iconSmall: 16,
	nativeSpinnerSmall: 20,
	switchWidth: 32,
	switchHeight: 18,
	switchThumb: 14,
	switchInset: 2,
	avatar: 36,
	icon: 20,
	iconStroke: 1.7,
	content: 1080,
	reading: 720,
	drawer: 304,
	messageImage: 320,
	column: 300,
	wide: 900,
	swatch: 40,
	progress: 4,
	numberDigit: 23,
	numberSeparator: 10,
	tab: 64,
	disabledOpacity: 0.45,
	pressedOpacity: 0.82,
} as const;

export const control = {
	height: typography.field.lineHeight + space.xs * 2 + geometry.border * 2,
	paddingX: space.sm,
	paddingY: space.xs,
	gap: space.xs,
	segmentInset: space.half,
	icon: geometry.iconSmall,
	spinner: geometry.iconSmall,
	actionSize: space.lg,
	typography: typography.field,
	touchQuery: "(pointer: coarse)",
} as const;

const dangerAction = {
	background: lightColorScales.danger.solid,
	hover: lightColorScales.danger.text,
	pressed: "#991B1B",
	foreground: palette.white,
};

export const lightTheme: Theme = {
	coach: {
		background: lightColorScales.coach.subtle,
		foreground: lightColorScales.coach.text,
	},
	admin: {
		background: lightColorScales.admin.subtle,
		foreground: lightColorScales.admin.text,
	},
	dangerAction,
	colorScales: lightColorScales,
	background: {
		primary: palette.white,
		secondary: "#F5F5F5",
		selected: "#D3D3D8",
		tertiary: "#EEEEEE",
		hover: "#E8E8E8",
		pressed: "#DEDEDE",
		contrast: "#171717",
	},
	text: {
		primary: palette.black,
		secondary: "#555555",
		contrast: palette.white,
	},
	border: "#E5E5E5",
	controlBorder: "#858585",
	accent: {
		background: palette.accent,
		hover: "#0B46DC",
		pressed: lightColorScales.accent.text,
		foreground: palette.white,
	},
	focus: palette.accent,
	switchOn: "#242424",
	switchOff: "#E5E5E5",
	switchThumbOn: palette.white,
	switchThumbOff: "#737373",
	neutral: { background: "#F0F0F0", foreground: palette.black },
	brand: { background: palette.moss, foreground: palette.white },
	success: {
		background: lightColorScales.success.subtle,
		foreground: lightColorScales.success.text,
	},
	info: { background: "#F0F0F0", foreground: palette.black },
	warning: {
		background: lightColorScales.warning.subtle,
		foreground: lightColorScales.warning.text,
	},
	danger: {
		background: lightColorScales.danger.subtle,
		foreground: lightColorScales.danger.text,
	},
};

export const darkTheme: Theme = {
	coach: {
		background: darkColorScales.coach.subtle,
		foreground: darkColorScales.coach.text,
	},
	admin: {
		background: darkColorScales.admin.subtle,
		foreground: darkColorScales.admin.text,
	},
	dangerAction,
	colorScales: darkColorScales,
	background: {
		primary: "#111111",
		secondary: "#1C1C1C",
		selected: "#48484F",
		tertiary: "#252525",
		hover: "#2B2B2B",
		pressed: "#333333",
		contrast: "#F5F5F5",
	},
	text: {
		primary: palette.white,
		secondary: "#C0C0C0",
		contrast: palette.black,
	},
	border: "#292929",
	controlBorder: "#737373",
	accent: {
		background: palette.accent,
		hover: "#1C59F8",
		pressed: "#0B46DC",
		foreground: palette.white,
	},
	focus: "#829FFF",
	switchOn: "#E5E5E5",
	switchOff: "#333333",
	switchThumbOn: "#242424",
	switchThumbOff: "#D4D4D4",
	neutral: { background: "#242424", foreground: palette.white },
	brand: { background: palette.pine, foreground: palette.white },
	success: {
		background: darkColorScales.success.subtle,
		foreground: darkColorScales.success.text,
	},
	info: { background: "#242424", foreground: palette.white },
	warning: {
		background: darkColorScales.warning.subtle,
		foreground: darkColorScales.warning.text,
	},
	danger: {
		background: darkColorScales.danger.subtle,
		foreground: darkColorScales.danger.text,
	},
};

export type SpaceToken = keyof typeof space;
export type ElevationToken = keyof typeof elevation;
export type TypographyVariant = keyof typeof typography;
export type Kind =
	| "coach"
	| "admin"
	| "neutral"
	| "brand"
	| "success"
	| "info"
	| "warning"
	| "danger";
export type Theme = Record<
	| "border"
	| "controlBorder"
	| "switchOn"
	| "switchOff"
	| "switchThumbOn"
	| "switchThumbOff"
	| "focus",
	string
> & {
	colorScales: SemanticColorScales;
	background: Record<
		| "primary"
		| "secondary"
		| "selected"
		| "tertiary"
		| "hover"
		| "pressed"
		| "contrast",
		string
	>;
	text: Record<"primary" | "secondary" | "contrast", string>;
	accent: ActionColors;
	dangerAction: ActionColors;
} & Record<Kind, { background: string; foreground: string }>;

type ActionColors = Record<
	"background" | "foreground" | "hover" | "pressed",
	string
>;
