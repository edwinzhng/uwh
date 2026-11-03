import { atom } from "jotai";
import { createContext } from "react";

export type LoadingRequest = { scopeId: string; depth: number };
export const loadingRequestsAtom = atom<Record<string, LoadingRequest>>({});
export const activeLoadingScope = (
	requests: Record<string, LoadingRequest>,
): string | undefined =>
	Object.values(requests).reduce<LoadingRequest | undefined>(
		(selected, request) =>
			!selected || request.depth >= selected.depth ? request : selected,
		undefined,
	)?.scopeId;
export const activeLoadingScopeAtom = atom((get) =>
	activeLoadingScope(get(loadingRequestsAtom)),
);
export const LoadingScopeContext = createContext<
	{ id: string; depth: number; active: boolean } | undefined
>(undefined);
export const LoadingCoveredContext = createContext(false);
