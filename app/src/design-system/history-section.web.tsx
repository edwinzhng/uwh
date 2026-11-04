import { type ReactElement, useLayoutEffect, useRef } from "react";
import { HistorySectionHeader } from "./history-section-header";
import type { HistorySectionProps } from "./history-section-props";
import { space } from "./tokens";

export const HistorySection = ({
	children,
	loadMore,
	loading,
	revision,
	treatment,
}: HistorySectionProps): ReactElement => {
	const root = useRef<HTMLDivElement>(null);
	const current = useRef({ loadMore, loading });
	current.current = { loadMore, loading };
	const requesting = useRef(false);
	const request = (): void => {
		if (
			requesting.current ||
			!root.current ||
			current.current.loading ||
			!current.current.loadMore
		)
			return;
		requesting.current = true;
		current.current.loadMore();
	};
	useLayoutEffect(() => {
		if (revision >= 1 && !loading) requesting.current = false;
	}, [revision, loading]);

	return (
		<div
			ref={root}
			style={{
				minWidth: 0,
				overflowAnchor: "none",
				display: "flex",
				flexDirection: "column",
				gap: space.xs,
			}}
		>
			<HistorySectionHeader
				treatment={treatment}
				loadMore={loadMore ? request : undefined}
				loading={loading}
			/>
			<div>{children}</div>
		</div>
	);
};
