import type { MenuAction as NativeMenuAction } from "@expo/ui/community/menu";
import type { MenuGroup } from "./picker-props";

export const nativeMenuActions = (
	groups: readonly MenuGroup[],
	isDisabled = false,
): NativeMenuAction[] =>
	groups
		.filter((group) => group.items.length > 0)
		.map((group) => ({
			id: group.id,
			title: group.label ?? "",
			displayInline: true,
			subactions: group.items.map((item) => ({
				id: `${group.id}:${item.id}`,
				title: item.label,
				state:
					item.checked === undefined ? undefined : item.checked ? "on" : "off",
				attributes: {
					disabled: isDisabled || item.isDisabled,
					destructive: item.tone === "danger",
				},
			})),
		}));
