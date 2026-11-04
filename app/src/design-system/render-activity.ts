type ActivitySource = {
	read: () => boolean;
	subscribe: (notify: () => void) => () => void;
};

export const subscribeRenderActivity = (
	sources: readonly ActivitySource[],
	onChange: (active: boolean) => void,
): (() => void) => {
	const current: { active?: boolean } = {};
	const notify = (): void => {
		const active = sources.every((source) => source.read());
		if (current.active === active) return;
		current.active = active;
		onChange(active);
	};
	const subscriptions = sources.map((source) => source.subscribe(notify));
	notify();
	return (): void => {
		for (const unsubscribe of subscriptions) unsubscribe();
		if (current.active) onChange(false);
	};
};
