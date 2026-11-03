import { useSetAtom } from "jotai";
import { type ReactElement, useContext, useId, useLayoutEffect } from "react";
import { View } from "react-native";
import {
	LoadingCoveredContext,
	LoadingScopeContext,
	loadingRequestsAtom,
} from "./loading-state";
import { geometry, space } from "./tokens";
import { useScreenActive } from "./use-screen-active";

export const LoadingContent = (): ReactElement => {
	const scope = useContext(LoadingScopeContext);
	const covered = useContext(LoadingCoveredContext);
	const active = useScreenActive();
	const id = useId();
	const setRequests = useSetAtom(loadingRequestsAtom);
	useLayoutEffect(() => {
		if (!scope?.active || covered || !active) return;
		setRequests((current) => ({
			...current,
			[id]: { scopeId: scope.id, depth: scope.depth },
		}));
		return (): void =>
			setRequests((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([key]) => key !== id),
				),
			);
	}, [id, scope, covered, active, setRequests]);
	return <View style={{ minHeight: geometry.touch * 3 + space.sm * 4 }} />;
};
