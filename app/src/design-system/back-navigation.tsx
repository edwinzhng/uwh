import { createContext, type ReactElement, type ReactNode } from "react";

export const BackNavigationContext = createContext(false);

export const BackNavigation = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<BackNavigationContext value>{children}</BackNavigationContext>
);
