export type InfiniteScrollProps = {
	loadMore?: () => void;
	loading?: boolean;
	disabled?: boolean;
	revision?: string | number;
};
