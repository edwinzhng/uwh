export const createContentRevealState = (): {
	update: (state: {
		eligible: boolean;
		ready: boolean;
		active: boolean;
		animate: boolean;
	}) => "wait" | "play" | "show";
} => {
	const state = { played: false };
	return {
		update: ({ eligible, ready, active, animate }) => {
			if (!eligible || state.played) return "show";
			if (!ready || !active) return "wait";
			state.played = true;
			return animate ? "play" : "show";
		},
	};
};
