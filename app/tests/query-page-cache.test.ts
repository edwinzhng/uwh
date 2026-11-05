import { expect, test } from "bun:test";
import { createQueryPageCache } from "../src/features/query-page-cache";

test("returning to a visited filter restores only that filter's results, including a known empty result", () => {
	const cache = createQueryPageCache<string>();
	cache.write("monday", { items: ["Monday Practice"], complete: false });
	cache.write("friday", { items: [], complete: true });
	expect(cache.read("monday")).toEqual({
		items: ["Monday Practice"],
		complete: false,
	});
	expect(cache.read("friday")).toEqual({ items: [], complete: true });
	expect(cache.read("sunday")).toBeUndefined();
	const otherScreen = createQueryPageCache<string>();
	expect(otherScreen.read("monday")).toBeUndefined();
});
test("filter caching stays bounded and refreshes the oldest entry when new live data arrives", () => {
	const cache = createQueryPageCache<number>(2);
	cache.write("one", { items: [1], complete: true });
	cache.write("two", { items: [2], complete: true });
	cache.write("one", { items: [3], complete: false });
	cache.write("three", { items: [4], complete: true });
	expect(cache.read("two")).toBeUndefined();
	expect(cache.read("one")).toEqual({ items: [3], complete: false });
	expect(cache.read("three")?.items).toEqual([4]);
});
