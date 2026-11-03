import { type ReactElement, useLayoutEffect, useRef } from "react";
import { HistorySectionHeader } from "./history-section-header";
import type { HistorySectionProps } from "./history-section-props";
import { Stack } from "./stack";
export const HistorySection = ({
	children,
	loadMore,
	loading,
	revision,
	treatment,
}: HistorySectionProps): ReactElement => {
	const pending = useRef(false);
	useLayoutEffect(() => {
		if (revision >= 1 && !loading) pending.current = false;
	}, [revision, loading]);
	const request = (): void => {
		if (pending.current || loading || !loadMore) return;
		pending.current = true;
		loadMore();
	};
	return (
		<Stack gap="xs">
			<HistorySectionHeader
				treatment={treatment}
				loadMore={loadMore ? request : undefined}
				loading={loading}
			/>
			{children}
		</Stack>
	);
};
