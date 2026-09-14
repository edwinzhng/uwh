import { atom, useAtomValue } from "jotai";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type ThemePreference = "light" | "dark";
export const themePreferenceAtom = atom<ThemePreference>("light");
export const reduceMotionAtom = atom(false);

export const useTheme = (): Theme => {
	const preference = useAtomValue(themePreferenceAtom);
	return preference === "dark" ? darkTheme : lightTheme;
};
