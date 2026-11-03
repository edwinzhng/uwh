import type { InfiniteScrollProps } from "./infinite-scroll-props";

export const createInfiniteRequestGate = (): {
	update: (props: InfiniteScrollProps) => void;
	request: (props: InfiniteScrollProps) => void;
} => {
	const state: {
		revision?: string | number;
		loading?: boolean;
		requested: boolean;
	} = { requested: false };
	const update = (props: InfiniteScrollProps): void => {
		if (state.revision !== props.revision || state.loading !== props.loading) {
			state.revision = props.revision;
			state.loading = props.loading;
			state.requested = false;
		}
	};
	return {
		update,
		request: (props): void => {
			if (
				state.revision !== props.revision ||
				state.requested ||
				props.loading ||
				props.disabled ||
				!props.loadMore
			)
				return;
			state.requested = true;
			props.loadMore();
		},
	};
};
