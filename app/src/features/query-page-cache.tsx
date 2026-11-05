export const createQueryPageCache = <Item,>(
	limit = 8,
): {
	read: (key: string) => { items: Item[]; complete: boolean } | undefined;
	write: (key: string, page: { items: Item[]; complete: boolean }) => void;
} => {
	const pages = new Map<string, { items: Item[]; complete: boolean }>();
	return {
		read: (key) => pages.get(key),
		write: (key, page): void => {
			pages.delete(key);
			pages.set(key, page);
			if (pages.size > limit) {
				const oldest = pages.keys().next().value;
				if (oldest !== undefined) pages.delete(oldest);
			}
		},
	};
};
