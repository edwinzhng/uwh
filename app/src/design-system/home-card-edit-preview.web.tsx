import type { ReactElement, ReactNode } from "react";

export const HomeCardEditPreview = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => <div inert>{children}</div>;
