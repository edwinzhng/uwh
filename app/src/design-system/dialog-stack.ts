import { opacity, space } from "./tokens";

export type DialogStackEntry = {
	id: string;
	parent?: string;
	isOpen: boolean;
	presented?: boolean;
	frame?: DialogFrame;
};

export type DialogFrame = { top: number; height: number };

export type DialogStackAction =
	| { type: "upsert"; entry: DialogStackEntry }
	| { type: "remove"; id: string }
	| { type: "shown"; id: string }
	| { type: "layout"; id: string; frame: DialogFrame };

export type DialogLayer = {
	isTop: boolean;
	base: boolean;
	count: number;
	covered: boolean;
	depth: number;
	frame?: DialogFrame;
	frontTop?: number;
};

export const dialogCanPresent = (
	entries: readonly DialogStackEntry[],
	entry: DialogStackEntry,
): boolean => {
	if (entry.presented) return true;
	if (!entry.isOpen) return false;
	if (!entry.parent) return true;
	const parent = entries.find((candidate) => candidate.id === entry.parent);
	return Boolean(parent?.presented && parent.isOpen);
};

export const dialogStack = (
	entries: readonly DialogStackEntry[],
	action: DialogStackAction,
): readonly DialogStackEntry[] => {
	if (action.type === "remove")
		return entries.some((entry) => entry.id === action.id)
			? entries.filter((entry) => entry.id !== action.id)
			: entries;
	if (action.type === "shown") {
		const current = entries.find((entry) => entry.id === action.id);
		if (!current || current.presented || !dialogCanPresent(entries, current))
			return entries;
		return entries.map((entry) =>
			entry.id === action.id && entry.isOpen && dialogCanPresent(entries, entry)
				? { ...entry, presented: true }
				: entry,
		);
	}
	if (action.type === "layout") {
		const current = entries.find((entry) => entry.id === action.id);
		if (
			!current ||
			(current.frame?.top === action.frame.top &&
				current.frame.height === action.frame.height)
		)
			return entries;
		return entries.map((entry) =>
			entry.id === action.id ? { ...entry, frame: action.frame } : entry,
		);
	}
	const index = entries.findIndex((entry) => entry.id === action.entry.id);
	const current = entries.at(index);
	if (index >= 0 && current)
		return current.parent === action.entry.parent &&
			current.isOpen === action.entry.isOpen
			? entries
			: entries.map((entry) =>
					entry.id === action.entry.id ? { ...entry, ...action.entry } : entry,
				);
	const child = entries.findIndex((entry) => entry.parent === action.entry.id);
	return child < 0
		? [...entries, action.entry]
		: [...entries.slice(0, child), action.entry, ...entries.slice(child)];
};

export const dialogLayer = (
	entries: readonly DialogStackEntry[],
	id: string,
): DialogLayer => {
	const active = entries.filter((entry) => dialogCanPresent(entries, entry));
	const index = active.findIndex((entry) => entry.id === id);
	const above = index < 0 ? [] : active.slice(index + 1);
	return {
		isTop: index < 0 ? active.length === 0 : index === active.length - 1,
		base: index < 0 ? active.length === 0 : index === 0,
		count: active.length,
		covered: above.length > 0,
		depth: Math.min(2, above.filter((entry) => entry.isOpen).length),
		frame: entries.find((entry) => entry.id === id)?.frame,
		frontTop: above.filter((entry) => entry.isOpen).at(-1)?.frame?.top,
	};
};

export const dialogStackGeometry = (
	depth: number,
	height: number,
	mobile: boolean,
	top = height,
	safeTop = 0,
	frontTop = top,
): { scale: number; translateY: number; dim: number } => {
	"worklet";
	const bounded = Number.isFinite(depth) ? Math.max(0, Math.min(2, depth)) : 0;
	const scale = mobile ? 1 - bounded * 0.05 : 1;
	const inset = bounded * space.sm;
	const edgeShift = Math.max(
		(frontTop - top) * Math.min(1, bounded) - inset,
		(safeTop - top) * Math.min(1, bounded) + inset,
	);
	return {
		scale,
		translateY: mobile
			? edgeShift - (Math.max(0, height) * (1 - scale)) / 2
			: 0,
		dim: Math.min(1, bounded) * opacity.backdrop,
	};
};
