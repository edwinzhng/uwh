import { createContext, useEffect, useMemo } from "react";

type PaginationSignal = {
	subscribe: (listener: () => void) => () => void;
	notify: () => void;
	dispose: () => void;
};
export const PaginationActivity = createContext<PaginationSignal | undefined>(
	undefined,
);
export const usePaginationSignal = (): PaginationSignal => {
	const signal = useMemo((): PaginationSignal => {
		const listeners = new Set<() => void>();
		const state: { frame?: number } = {};
		return {
			subscribe: (listener): (() => void) => {
				listeners.add(listener);
				return (): void => {
					listeners.delete(listener);
				};
			},
			notify: (): void => {
				if (!listeners.size || state.frame !== undefined) return;
				state.frame = requestAnimationFrame((): void => {
					state.frame = undefined;
					for (const listener of listeners) listener();
				});
			},
			dispose: (): void => {
				if (state.frame !== undefined) cancelAnimationFrame(state.frame);
				listeners.clear();
			},
		};
	}, []);
	useEffect(() => (): void => signal.dispose(), [signal]);
	return signal;
};
