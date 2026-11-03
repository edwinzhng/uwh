import { createContext } from "react";
import type { Theme } from "./tokens";
export const ThemeScopeContext = createContext<Theme | undefined>(undefined);
