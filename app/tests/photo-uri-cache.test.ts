import { expect, test } from "bun:test";
import { createPhotoUriCache } from "../src/features/photo-uri-cache";

test("avatar requests deduplicate, release removed photos and can restart after cleanup", async (): Promise<void> => {
	const calls: string[] = [];
	const released: string[] = [];
	const cache = createPhotoUriCache({
		load: async (id): Promise<Blob> => {
			calls.push(id);
			return new Blob([id]);
		},
		createUri: async (blob): Promise<string> => `blob:${await blob.text()}`,
		releaseUri: (uri): void => {
			released.push(uri);
		},
	});
	const first = cache.load("a");
	expect(cache.load("a")).toBe(first);
	expect(await first).toBe("blob:a");
	await cache.load("b");
	cache.prune(new Set(["b"]));
	expect(released).toEqual(["blob:a"]);
	cache.clear();
	expect(released).toEqual(["blob:a", "blob:b"]);
	expect(await cache.load("a")).toBe("blob:a");
	expect(calls).toEqual(["a", "b", "a"]);
	cache.clear();
});

test("abandoned avatar requests do not encode or retain late image bytes", async (): Promise<void> => {
	const pending = { finish: (_blob: Blob): void => {} };
	const blob = new Promise<Blob>((resolve): void => {
		pending.finish = resolve;
	});
	const encoded: Blob[] = [];
	const cache = createPhotoUriCache({
		load: async (): Promise<Blob> => blob,
		createUri: async (value): Promise<string> => {
			encoded.push(value);
			return "blob:late";
		},
		releaseUri: (): void => {},
	});
	const request = cache.load("late");
	await Promise.resolve();
	cache.clear();
	pending.finish(new Blob(["late"]));
	expect(await request).toBeUndefined();
	expect(encoded).toHaveLength(0);
});

test("failed avatar fetches are retryable instead of poisoning the cache", async (): Promise<void> => {
	const attempts: string[] = [];
	const cache = createPhotoUriCache({
		load: async (id): Promise<Blob> => {
			attempts.push(id);
			if (attempts.length === 1) throw new Error("offline");
			return new Blob([id]);
		},
		createUri: async (): Promise<string> => "blob:retry",
		releaseUri: (): void => {},
	});
	expect(await cache.load("a")).toBeUndefined();
	expect(await cache.load("a")).toBe("blob:retry");
	cache.clear();
});
