import type { ReactNode } from "react";
import type { SpaceToken } from "./tokens";

export type ContentRevealProps = {
	children: ReactNode;
	enabled?: boolean;
	delay?: number;
	fill?: boolean;
	gap?: SpaceToken;
};
export type PageRevealProps = Omit<ContentRevealProps, "gap"> & {
	gap?: "none";
	replayOnFocus?: boolean;
	replayKey?: string;
};
