import type { ReactElement } from "react";
import { PrimaryWorkspace } from "./primary-workspace";

export const HomeWorkspace = ({
	children,
}: {
	children: ReactElement;
}): ReactElement => (
	<PrimaryWorkspace screen="home">{children}</PrimaryWorkspace>
);
