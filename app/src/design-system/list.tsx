import type { ReactElement, ReactNode } from "react";
import { Stack } from "./stack";
export const List = ({ children }: { children: ReactNode }): ReactElement => (
	<Stack gap="none">{children}</Stack>
);
