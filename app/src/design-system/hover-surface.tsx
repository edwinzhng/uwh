import { Fragment, type ReactElement, type ReactNode } from "react";

export const HoverSurface = ({
	children,
}: {
	children: ReactNode;
	selector?: string;
}): ReactElement => <Fragment>{children}</Fragment>;
