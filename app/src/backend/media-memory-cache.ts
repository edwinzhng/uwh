type Entry = { blob: Blob; etag: string };
export const createMediaMemoryCache = (
	limit: number,
	maxEntries = 128,
): {
	get: (id: string) => Entry | undefined;
	put: (id: string, entry: Entry) => void;
	remove: (id: string) => void;
} => {
	const entries = new Map<string, Entry>();
	const bytes = { value: 0 };
	const remove = (id: string): void => {
		const existing = entries.get(id);
		if (!existing) return;
		bytes.value -= existing.blob.size;
		entries.delete(id);
	};
	return {
		get: (id): Entry | undefined => {
			const entry = entries.get(id);
			if (!entry) return undefined;
			entries.delete(id);
			entries.set(id, entry);
			return entry;
		},
		put: (id, entry): void => {
			remove(id);
			if (entry.blob.size > limit || maxEntries <= 0) return;
			while (
				bytes.value + entry.blob.size > limit ||
				entries.size >= maxEntries
			) {
				const oldest = entries.keys().next().value;
				if (oldest === undefined) break;
				remove(oldest);
			}
			entries.set(id, entry);
			bytes.value += entry.blob.size;
		},
		remove,
	};
};
