export const createPhotoUriCache = ({
	load,
	createUri,
	releaseUri,
}: {
	load: (id: string, signal: AbortSignal) => Promise<Blob>;
	createUri: (blob: Blob) => Promise<string>;
	releaseUri: (uri: string) => void;
}): {
	load: (id: string) => Promise<string | undefined>;
	prune: (ids: ReadonlySet<string>) => void;
	clear: () => void;
} => {
	const cache = new Map<
		string,
		{
			promise: Promise<string | undefined>;
			request: { controller: AbortController; active: boolean; uri: string };
		}
	>();
	const discard = (id: string): void => {
		const entry = cache.get(id);
		if (!entry) return;
		entry.request.active = false;
		entry.request.controller.abort();
		if (entry.request.uri) releaseUri(entry.request.uri);
		cache.delete(id);
	};
	return {
		load: (id): Promise<string | undefined> => {
			const existing = cache.get(id);
			if (existing) return existing.promise;
			const request = {
				controller: new AbortController(),
				active: true,
				uri: "",
			};
			const promise = Promise.resolve()
				.then(() =>
					request.active ? load(id, request.controller.signal) : undefined,
				)
				.then(async (blob): Promise<string | undefined> => {
					if (!request.active || !blob) return undefined;
					const uri = await createUri(blob);
					if (!request.active) {
						releaseUri(uri);
						return undefined;
					}
					request.uri = uri;
					return uri;
				})
				.catch((): undefined => {
					if (cache.get(id)?.request === request) cache.delete(id);
					return undefined;
				});
			cache.set(id, { promise, request });
			return promise;
		},
		prune: (ids): void => {
			for (const id of cache.keys()) if (!ids.has(id)) discard(id);
		},
		clear: (): void => {
			for (const id of cache.keys()) discard(id);
		},
	};
};
