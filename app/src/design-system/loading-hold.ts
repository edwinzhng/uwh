type Clock = {
	now: () => number;
	schedule: (callback: () => void, delay: number) => () => void;
};

export const createLoadingHold = ({
	minimum,
	clock,
	onChange,
}: {
	minimum: number;
	clock: Clock;
	onChange: (visible: boolean) => void;
}): { setLoading: (loading: boolean) => void; dispose: () => void } => {
	const state: { startedAt?: number; cancel?: () => void } = {};
	const hide = (): void => {
		state.startedAt = undefined;
		state.cancel = undefined;
		onChange(false);
	};
	return {
		setLoading: (loading): void => {
			state.cancel?.();
			state.cancel = undefined;
			if (loading) {
				if (state.startedAt === undefined) {
					state.startedAt = clock.now();
					onChange(true);
				}
				return;
			}
			if (state.startedAt === undefined) return;
			const remaining = Math.max(0, minimum - (clock.now() - state.startedAt));
			if (remaining === 0) hide();
			else state.cancel = clock.schedule(hide, remaining);
		},
		dispose: (): void => {
			state.cancel?.();
			state.cancel = undefined;
		},
	};
};
