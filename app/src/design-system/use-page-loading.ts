import { useSetAtom } from "jotai";
import { useContext, useId, useLayoutEffect } from "react";
import {
	LoadingPageContext,
	LoadingScopeContext,
	loadingRequestsAtom,
} from "./loading-state";
import { useScreenActive } from "./use-screen-active";

export const usePageLoading = (loading: boolean): void => {
	const scope = useContext(LoadingScopeContext);
	const pageId = useContext(LoadingPageContext);
	const active = useScreenActive();
	const id = useId();
	const setRequests = useSetAtom(loadingRequestsAtom);
	useLayoutEffect(() => {
		if (!loading || !scope?.active || !active) return;
		setRequests((current) => ({
			...current,
			[id]: { scopeId: scope.id, depth: scope.depth, pageId },
		}));
		return (): void =>
			setRequests((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([key]) => key !== id),
				),
			);
	}, [loading, id, scope, pageId, active, setRequests]);
};
