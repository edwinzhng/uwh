import { geometry, motion, space } from "./tokens";

export type DialogPresentation = "dialog" | "sheet";
export type DialogIntent =
	| "form"
	| "detail"
	| "confirmation"
	| "picker"
	| "lineup";

export type DialogRetention = {
	isOpen: boolean;
	retained: boolean;
	transition: number;
};

type RetentionAction =
	| {
			type: "visibility";
			isOpen: boolean;
			animate: boolean;
			transition: number;
	  }
	| { type: "exited"; transition: number };

export const initialDialogRetention = (isOpen: boolean): DialogRetention => ({
	isOpen,
	retained: isOpen,
	transition: 0,
});

export const dialogRetention = (
	state: DialogRetention,
	action: RetentionAction,
): DialogRetention => {
	if (action.type === "exited")
		return !state.isOpen && action.transition === state.transition
			? { ...state, retained: false }
			: state;
	if (action.transition < state.transition) return state;
	return {
		isOpen: action.isOpen,
		retained: action.isOpen || (action.animate && state.retained),
		transition: action.transition,
	};
};

export const dialogPresentation = (
	width: number,
	platform: "web" | "native" = "web",
): DialogPresentation =>
	platform === "native" || width < geometry.wide ? "sheet" : "dialog";

export const dialogContentWidth = (intent: DialogIntent): number =>
	intent === "lineup"
		? geometry.wide + space.xxl * 2
		: intent === "confirmation" || intent === "picker"
			? geometry.narrow
			: geometry.reading;

export const canDismissDialog = ({
	isOpen,
	isTop,
	isDismissDisabled,
}: {
	isOpen: boolean;
	isTop: boolean;
	isDismissDisabled: boolean;
}): boolean => isOpen && isTop && !isDismissDisabled;

export const dialogMaxHeight = (
	presentation: DialogPresentation,
	height: number,
	top: number,
	bottom: number,
): number => {
	const available = Math.max(0, height);
	if (presentation === "sheet")
		return Math.max(0, Math.min(available * 0.85, available - top));
	return Math.max(
		0,
		available - Math.max(space.lg, top) - Math.max(space.lg, bottom),
	);
};

export const dialogTransitionDuration = (animate: boolean): number => {
	"worklet";
	return animate ? motion.duration.standard : motion.duration.instant;
};

export const dialogStepChanged = (
	previous: string | undefined,
	current: string | undefined,
	isOpen: boolean,
): boolean =>
	isOpen &&
	previous !== undefined &&
	current !== undefined &&
	previous !== current;

export const canStartSheetDrag = (x: number, y: number): boolean => {
	"worklet";
	return (
		Number.isFinite(x) && Number.isFinite(y) && y > space.xs && y > Math.abs(x)
	);
};

export const sheetDragOffset = (distance: number): number => {
	"worklet";
	return Number.isFinite(distance) ? Math.max(0, distance) : 0;
};

export const shouldDismissSheet = (distance: number): boolean => {
	"worklet";
	return sheetDragOffset(distance) >= 100;
};
