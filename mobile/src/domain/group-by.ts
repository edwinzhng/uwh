export const groupBy = <Item, Key>(
	items: readonly Item[],
	keyFor: (item: Item) => Key,
): Map<Key, Item[]> => {
	const groups = new Map<Key, Item[]>();
	for (const item of items) {
		const key = keyFor(item);
		const group = groups.get(key);
		if (group) group.push(item);
		else groups.set(key, [item]);
	}
	return groups;
};
