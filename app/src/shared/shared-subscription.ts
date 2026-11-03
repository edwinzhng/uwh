export const createSharedSubscription = (
	start: (notify: () => void) => () => void,
): ((listener: () => void) => () => void) => {
	const listeners = new Set<() => void>();
	const state: { stop?: () => void } = {};
	return (listener): (() => void) => {
		listeners.add(listener);
		state.stop ??= start((): void => {
			for (const notify of listeners) notify();
		});
		return (): void => {
			listeners.delete(listener);
			if (listeners.size) return;
			state.stop?.();
			state.stop = undefined;
		};
	};
};
