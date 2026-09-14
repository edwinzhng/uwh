import type { ReactElement, ReactNode } from "react";

export const PopupPortalProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => <>{children}</>;
