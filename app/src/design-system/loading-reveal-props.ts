import type { ReactNode } from "react";
export type LoadingRevealProps = {
	ready: boolean;
	distance?: number;
	children: ReactNode;
	wordmark?: boolean;
};
