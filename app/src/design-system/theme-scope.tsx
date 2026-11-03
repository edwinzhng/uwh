import type { ReactElement, ReactNode } from "react";
import { ThemeScopeContext } from "./theme-scope-context";
import { darkTheme, lightTheme } from "./tokens";
export const ThemeScope = ({
	appearance,
	children,
}: {
	appearance: "light" | "dark";
	children: ReactNode;
}): ReactElement => (
	<ThemeScopeContext value={appearance === "light" ? lightTheme : darkTheme}>
		{children}
	</ThemeScopeContext>
);
