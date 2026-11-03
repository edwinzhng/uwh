import { useCallback, useEffect, useRef } from "react";
import { createInfiniteRequestGate } from "./infinite-request-gate";
import type { InfiniteScrollProps } from "./infinite-scroll-props";

export const useInfiniteRequest = ({
	revision,
	loading,
	disabled,
	loadMore,
}: InfiniteScrollProps): (() => void) => {
	const gate = useRef(createInfiniteRequestGate());
	useEffect((): void => {
		gate.current.update({ revision, loading });
	}, [revision, loading]);
	return useCallback(
		(): void => gate.current.request({ revision, loading, disabled, loadMore }),
		[revision, loading, disabled, loadMore],
	);
};
