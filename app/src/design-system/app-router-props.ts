import type { ReactElement, ReactNode } from "react";

export type AppRouterProps = {
	renderScreen?: (
		name: string,
		params: Readonly<Record<string, unknown>> | undefined,
		children: ReactNode,
	) => ReactElement;
};
