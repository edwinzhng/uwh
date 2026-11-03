import type { Theme } from "./tokens";

export type PendingNavigation = { routeKey: string; label: string };
export type NavigationFrameGeometry = { left: number; width: number };

export const phoneNavigationItems = <
	Item extends { label: string; showOnPhone?: boolean },
>(
	items: readonly Item[],
): Item[] => items.filter((item) => item.showOnPhone !== false);

export const navigationSelection = (
	items: { label: string; selected: boolean }[],
	routeKey: string,
	pending?: PendingNavigation,
): number =>
	items.findIndex((item) =>
		pending?.routeKey === routeKey
			? item.label === pending.label
			: item.selected,
	);

export const navigationGeometry = (
	width: number,
	count: number,
	index: number,
): NavigationFrameGeometry | undefined => {
	if (
		!Number.isFinite(width) ||
		width <= 0 ||
		!Number.isSafeInteger(count) ||
		count <= 0 ||
		!Number.isSafeInteger(index) ||
		index < 0 ||
		index >= count
	)
		return;
	const itemWidth = width / count;
	return { left: index * itemWidth, width: itemWidth };
};

export const hasUnread = (count?: number): boolean =>
	Number.isSafeInteger(count) && (count ?? 0) > 0;

export const navigationLabel = (label: string, count?: number): string =>
	hasUnread(count)
		? `${label}, ${count} unread ${count === 1 ? "conversation" : "conversations"}`
		: label;

export const navigationGradient = (
	theme: Theme,
	selected: boolean,
	interacting: boolean,
): [string, string] | undefined => {
	if (!selected && !interacting) return;
	const color = selected ? theme.navigation.selected : theme.navigation.hover;
	return [color, `${color}00`];
};
