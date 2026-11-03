import type { ReactElement, ReactNode } from "react";
import { LoadingContent } from "./loading-content";
import { Stack } from "./stack";
import type { SpaceToken } from "./tokens";

export const LoadingBoundary = ({
	loading,
	children,
	fill,
	gap,
}: {
	loading: boolean;
	children: ReactNode | (() => ReactNode);
	fill?: boolean;
	gap?: SpaceToken;
}): ReactElement =>
	loading ? (
		<LoadingContent />
	) : (
		<Stack grow={fill} gap={gap ?? "none"}>
			{typeof children === "function" ? children() : children}
		</Stack>
	);
