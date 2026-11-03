import { atom, useAtomValue } from "jotai";
import { useContext } from "react";
import { ThemeScopeContext } from "./theme-scope-context";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";
export const themePreferenceAtom = atom<ThemePreference>("system");
export const reduceMotionAtom = atom(false);
export const systemThemeAtom = atom<"light" | "dark">("light");

const resolvedThemeAtom = atom((get): Theme => {
	const preference = get(themePreferenceAtom);
	return (preference === "system" ? get(systemThemeAtom) : preference) ===
		"dark"
		? darkTheme
		: lightTheme;
});

export const useTheme = (): Theme => {
	const scope = useContext(ThemeScopeContext);
	const theme = useAtomValue(resolvedThemeAtom);
	return scope ?? theme;
};
