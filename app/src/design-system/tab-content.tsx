import { Fragment, type ReactElement, type ReactNode } from "react";
import { Stack } from "./stack";

export const TabContent = ({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}): ReactElement => (
	<Stack gap="xl">
		<Fragment key={value}>{children}</Fragment>
	</Stack>
);
