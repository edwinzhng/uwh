import { atom } from "jotai";
import { useContext } from "react";
import { ThemeScopeContext } from "./theme-scope-context";
import { darkTheme, type Theme } from "./tokens";

export const reduceMotionAtom = atom(false);
export const useTheme = (): Theme => useContext(ThemeScopeContext) ?? darkTheme;
