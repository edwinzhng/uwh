import type { ReactNode } from "react";
export type HistoryControlTreatment = "heading" | "inline" | "divider";
export type HistorySectionProps = {
	children: ReactNode;
	treatment?: HistoryControlTreatment;
	loadMore?: () => void;
	loading: boolean;
	revision: number;
};
