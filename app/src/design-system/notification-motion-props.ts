import type { ReactNode } from "react";
export type NotificationMotionProps = {
	count: number;
	kind: "bell" | "count";
	children: ReactNode;
};
