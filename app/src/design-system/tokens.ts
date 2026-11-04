import {
	darkColorScales,
	lightColorScales,
	type SemanticColorScales,
} from "./color-scales";
import { rainbowSurface } from "./rainbow-palette";

export const palette = {
	accent: lightColorScales.accent.solid,
	black: "#000000",
	white: "#FFFFFF",
} as const;

export {
	layer,
	motion,
	opacity,
	radius,
	space,
} from "@uwhclub/design-system/tokens";

import {
	corners as sharedCorners,
	elevation as sharedElevation,
	radius as sharedRadius,
	space,
} from "@uwhclub/design-system/tokens";
export const corners = {
	...sharedCorners,
	control: sharedRadius.md,
	button: sharedRadius.md,
	navigation: sharedRadius.md,
	menuRow: sharedRadius.md,
	menu: sharedRadius.md + space.xs,
	item: sharedRadius.md,
	panel: sharedRadius.md,
	overlay: sharedRadius.xxxl,
};
export const font = {
	heading: "UwhClubDisplay",
	regular: "UwhClubInter",
	medium: "UwhClubInterMedium",
	semibold: "UwhClubInterSemibold",
} as const;

export const elevation = {
	...sharedElevation,
	raised: {
		boxShadow: "0 1px 2px rgba(0,0,0,0.025), 0 4px 12px rgba(0,0,0,0.035)",
		elevation: 1,
	},
	floating: {
		boxShadow: "0 2px 4px rgba(0,0,0,0.035), 0 8px 24px rgba(0,0,0,0.07)",
		elevation: 4,
	},
	overlay: {
		boxShadow: "0 4px 12px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.12)",
		elevation: 8,
	},
};

export const pageMaterialOpacity = { light: 0.025, dark: 0.04 } as const;

export const progressColors = ["#173E2B", "#638E41", "#D8FF63"] as const;

import { typography as sharedTypography } from "@uwhclub/design-system/tokens";

export const typography = {
	...sharedTypography,
	h1: {
		...sharedTypography.h1,
		family: "heading",
		fontSize: 32,
		lineHeight: 36,
		textTransform: "uppercase",
		letterSpacing: -0.4,
	},
	h2: {
		...sharedTypography.h4,
		family: "semibold",
		fontSize: 18,
		lineHeight: 24,
	},
	h3: {
		...sharedTypography.h4,
		family: "semibold",
		fontSize: 18,
		lineHeight: 24,
	},
	h4: {
		...sharedTypography.h4,
		family: "semibold",
		fontSize: 18,
		lineHeight: 24,
	},
	body: { ...sharedTypography.body, fontSize: 16, lineHeight: 24 },
	small: { ...sharedTypography.small, fontSize: 14, lineHeight: 20 },
	caption: { ...sharedTypography.caption, fontSize: 14, lineHeight: 20 },
	overline: {
		...sharedTypography.overline,
		fontSize: 12,
		lineHeight: 16,
		textTransform: "uppercase",
	},
	label: {
		...sharedTypography.label,
		fontSize: 16,
		lineHeight: 22,
		family: "medium",
	},
	field: { ...sharedTypography.field, fontSize: 16, lineHeight: 22 },
	navigation: {
		...sharedTypography.caption,
		fontSize: 12,
		lineHeight: 16,
		family: "medium",
	},
	number: {
		...sharedTypography.number,
		family: "heading",
		fontSize: 32,
		lineHeight: 36,
	},
} as const;

export const geometry = {
	chart: 220,
	chartBar: 40,
	border: 1,
	focus: 2,
	touch: 44,
	control: 44,
	compactControl: 32,
	listRow: 36,
	calendarDay: 36,
	popupWidth: 224,
	personPopupWidth: 360,
	compactPickerWidth: 144,
	popupMaxHeight: 320,
	iconSmall: 16,
	nativeSpinnerSmall: 20,
	switchWidth: 32,
	switchHeight: 18,
	switchThumb: 14,
	switchInset: 2,
	avatar: 36,
	compactAvatar: 28,
	icon: 20,
	iconStroke: 1.8,
	content: 1080,
	reading: 720,
	drawer: 304,
	messageImage: 320,
	column: 300,
	wide: 900,
	narrow: 480,
	swatch: 40,
	progress: 8,
	numberDigit: 23,
	numberSeparator: 10,
	tab: 64,
	disabledOpacity: 0.45,
	pressedOpacity: 0.82,
} as const;

export const featureColors = {
	light: {
		fern: rainbowSurface("green", "light"),
		sky: rainbowSurface("blue", "light"),
		amber: rainbowSurface("yellow", "light"),
		violet: rainbowSurface("violet", "light"),
		coral: rainbowSurface("red", "light"),
		orange: rainbowSurface("orange", "light"),
		indigo: rainbowSurface("indigo", "light"),
	},
	dark: {
		fern: rainbowSurface("green", "dark"),
		sky: rainbowSurface("blue", "dark"),
		amber: rainbowSurface("yellow", "dark"),
		violet: rainbowSurface("violet", "dark"),
		coral: rainbowSurface("red", "dark"),
		orange: rainbowSurface("orange", "dark"),
		indigo: rainbowSurface("indigo", "dark"),
	},
} as const;

export const categoryPalette = featureColors;
export type CategoryColor = keyof typeof categoryPalette.light;

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
	hover: lightColorScales.danger.solid,
	pressed: lightColorScales.danger.solid,
	foreground: palette.black,
};

export const lightTheme: Theme = {
	mode: "light",
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
		canvas: "#F7F8F5",
		card: "#FFFFFF",
		primary: "#F7F8F5",
		secondary: "#ECEFE9",
		selected: "#E2E8DF",
		tertiary: "#E5E9E2",
		hover: "#ECEFE9",
		pressed: "#D8DED3",
		contrast: "#182018",
	},
	text: {
		primary: "#111811",
		secondary: "#465044",
		contrast: palette.white,
	},
	border: "#D8DED3",
	controlBorder: "#697564",
	accent: {
		background: "#182018",
		hover: "#2A3527",
		pressed: "#111811",
		foreground: "#D8FF63",
	},
	navigation: {
		selected: "#E2E8DF",
		hover: "#ECEFE9",
		indicator: "#182018",
		unread: "#182018",
	},
	focus: "#182018",
	switchOn: "#182018",
	switchOff: "#D5DCD0",
	switchThumbOn: palette.white,
	switchThumbOff: "#56644E",
	neutral: { background: "#ECEFE9", foreground: "#111811" },
	brand: { background: "#182018", foreground: palette.white },
	success: {
		background: lightColorScales.success.subtle,
		foreground: lightColorScales.success.text,
	},
	info: { background: "#ECEFE9", foreground: "#111811" },
	pending: {
		background: lightColorScales.pending.subtle,
		foreground: lightColorScales.pending.text,
	},
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
	mode: "dark",
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
		canvas: "#121812",
		card: "#1C251C",
		primary: "#1C251C",
		secondary: "#263026",
		selected: "#384436",
		tertiary: "#2B3528",
		hover: "#2A3627",
		pressed: "#3A482E",
		contrast: "#EEF2D9",
	},
	text: {
		primary: "#EEF2D9",
		secondary: "#A8B8A6",
		contrast: palette.black,
	},
	border: "#344634",
	controlBorder: "#819078",
	accent: {
		background: "#D8FF63",
		hover: "#CBF05B",
		pressed: "#BBDC50",
		foreground: "#162010",
	},
	navigation: {
		selected: "#384436",
		hover: "#2A3627",
		indicator: "#D8FF63",
		unread: "#D8FF63",
	},
	focus: "#D8FF63",
	switchOn: "#D8FF63",
	switchOff: "#3A4834",
	switchThumbOn: "#162010",
	switchThumbOff: "#B7C7A8",
	neutral: { background: "#2B3528", foreground: "#EEF2D9" },
	brand: { background: "#22342A", foreground: "#EEF2D9" },
	success: {
		background: darkColorScales.success.subtle,
		foreground: darkColorScales.success.text,
	},
	info: { background: "#263026", foreground: palette.white },
	pending: {
		background: darkColorScales.pending.subtle,
		foreground: darkColorScales.pending.text,
	},
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
	| "pending"
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
	mode: "light" | "dark";
	colorScales: SemanticColorScales;
	background: Record<
		| "canvas"
		| "card"
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
	navigation: Record<"selected" | "hover" | "indicator" | "unread", string>;
	dangerAction: ActionColors;
} & Record<Kind, { background: string; foreground: string }>;

type ActionColors = Record<
	"background" | "foreground" | "hover" | "pressed",
	string
>;

export const unmarkedCardColors = {
	light: { background: "#F0F2F1", border: "#747C77" },
	dark: { background: "#222725", border: "#828A85" },
} as const;
