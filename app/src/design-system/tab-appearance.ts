import { createContext, useContext } from "react";
import { corners, space, type Theme } from "./tokens";

export type TabAppearance = "current" | "inset" | "outline" | "underline";
export const TabAppearanceContext = createContext<TabAppearance>("outline");
export const useTabAppearance = (): TabAppearance =>
	useContext(TabAppearanceContext);
export const tabAppearance = (
	appearance: TabAppearance,
	theme: Theme,
): {
	inset: number;
	gap: number;
	radius: number;
	background: string;
	selected: string;
	selectedBorder?: string;
	optionPadding: number;
} => ({
	inset:
		appearance === "current"
			? space.xs
			: appearance === "inset"
				? space.xxs
				: 0,
	gap: appearance === "current" || appearance === "outline" ? space.xxs : 0,
	radius: appearance === "underline" ? 0 : corners.control,
	background:
		appearance === "current"
			? theme.background.secondary
			: appearance === "inset"
				? theme.background.canvas
				: "transparent",
	selected:
		appearance === "underline" ? theme.text.primary : theme.background.selected,
	selectedBorder: appearance === "inset" ? theme.border : undefined,
	optionPadding: appearance === "current" ? space.xs : space.sm,
});
