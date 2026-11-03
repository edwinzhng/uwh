import type { MenuGroup } from "./picker-props";

export const contextMenuKey = (key: string, shiftKey: boolean): boolean =>
	key === "ContextMenu" || (key === "F10" && shiftKey);

export const invokeMenuAction = (
	groups: readonly MenuGroup[],
	id: string,
	isDisabled = false,
): boolean => {
	if (isDisabled) return false;
	const action = groups
		.flatMap((group) =>
			group.items.filter((item) => `${group.id}:${item.id}` === id),
		)
		.at(0);
	if (!action || action.isDisabled) return false;
	action.onSelect();
	return true;
};
