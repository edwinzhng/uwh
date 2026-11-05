import type { ReactElement, ReactNode } from "react";
import { PageReady } from "./page-ready";
import { Stack } from "./stack";

export const TabContent = ({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}): ReactElement => (
	<Stack gap="xl">
		<PageReady
			contentKey=""
			layoutKey={value}
			fill={false}
			registerWithParent
			waitForLayout={false}
		>
			{children}
		</PageReady>
	</Stack>
);
