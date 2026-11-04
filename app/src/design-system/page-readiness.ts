export const createPageReadiness = ({
	scheduleFrame,
	onChange,
}: {
	scheduleFrame: (callback: () => void) => () => void;
	onChange: (ready: boolean) => void;
}): {
	update: (
		routeLoading: boolean,
		sectionLoading: boolean,
		contentKey?: string,
	) => void;
	layout: () => void;
	dispose: () => void;
} => {
	const state: {
		shown: boolean;
		ready: boolean;
		pending: boolean;
		contentKey?: string;
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
		update: (routeLoading, sectionLoading, contentKey = ""): void => {
			if (state.contentKey !== contentKey) {
				cancel();
				state.contentKey = contentKey;
				state.shown = false;
				if (state.ready) {
					state.ready = false;
					onChange(false);
				}
			}
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
