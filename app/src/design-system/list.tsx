import type { ReactElement, ReactNode } from "react";
import { Stack } from "./stack";
import type { SpaceToken } from "./tokens";
export const List = ({
	children,
	gap = "none",
}: {
	children: ReactNode;
	gap?: SpaceToken;
}): ReactElement => <Stack gap={gap}>{children}</Stack>;
