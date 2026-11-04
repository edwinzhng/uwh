export const createLoadingDelay = ({
	delay,
	schedule,
	onChange,
}: {
	delay: number;
	schedule: (callback: () => void, delay: number) => () => void;
	onChange: (visible: boolean) => void;
}): { update: (loading: boolean) => void; dispose: () => void } => {
	const state: { visible: boolean; revision: number; cancel?: () => void } = {
		visible: false,
		revision: 0,
	};
	const cancel = (): void => {
		state.revision += 1;
		state.cancel?.();
		state.cancel = undefined;
	};
	return {
		update: (loading): void => {
			if (!loading) {
				cancel();
				if (state.visible) {
					state.visible = false;
					onChange(false);
				}
				return;
			}
			if (state.visible || state.cancel) return;
			const revision = state.revision;
			state.cancel = schedule((): void => {
				if (revision !== state.revision) return;
				state.cancel = undefined;
				state.visible = true;
				onChange(true);
			}, delay);
		},
		dispose: cancel,
	};
};
