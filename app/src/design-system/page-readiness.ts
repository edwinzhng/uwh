export const createPageReadiness = ({
	scheduleFrame,
	onChange,
}: {
	scheduleFrame: (callback: () => void) => () => void;
	onChange: (ready: boolean) => void;
}): {
	update: (routeLoading: boolean, sectionLoading: boolean) => void;
	layout: () => void;
	dispose: () => void;
} => {
	const state: {
		shown: boolean;
		ready: boolean;
		pending: boolean;
		cancel?: () => void;
	} = { shown: false, ready: false, pending: false };
	const cancel = (): void => {
		state.cancel?.();
		state.cancel = undefined;
	};
	const settle = (): void => {
		cancel();
		state.cancel = scheduleFrame((): void => {
			state.cancel = scheduleFrame((): void => {
				state.cancel = undefined;
				state.shown = true;
				state.ready = true;
				onChange(true);
			});
		});
	};
	return {
		update: (routeLoading, sectionLoading): void => {
			if (routeLoading) state.shown = false;
			state.pending = routeLoading || (!state.shown && sectionLoading);
			if (state.pending) {
				cancel();
				if (state.ready) {
					state.ready = false;
					onChange(false);
				}
			} else if (!state.ready && !state.cancel) settle();
		},
		layout: (): void => {
			if (!state.ready && !state.pending) settle();
		},
		dispose: cancel,
	};
};
