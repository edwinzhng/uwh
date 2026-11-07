import { atom } from "jotai";
import { useContext } from "react";
import { ThemeScopeContext } from "./theme-scope-context";
import { lightTheme, type Theme } from "./tokens";

export const reduceMotionAtom = atom(false);
export const useTheme = (): Theme =>
	useContext(ThemeScopeContext) ?? lightTheme;
