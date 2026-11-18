import { expect, spyOn, test } from "bun:test";
import { createImageService } from "../src/backend/image-service";
import { createMediaMemoryCache } from "../src/backend/media-memory-cache";

test("reuses an attachment only after an authorized not-modified response", async (): Promise<void> => {
	const previousSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.invalid";
	const calls: { etag: string | null; token: string | null }[] = [];
	const responses = [
		new Response("photo", { status: 200, headers: { ETag: '"file-a"' } }),
		new Response(null, { status: 304 }),
		Response.json({ error: "Photo unavailable." }, { status: 404 }),
		new Response("replacement", { status: 200, headers: { ETag: '"file-b"' } }),
	];
	const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
		Object.assign(
			async (
				_url: string | Request | URL,
				init?: RequestInit,
			): Promise<Response> => {
				const headers = new Headers(init?.headers);
				calls.push({
					etag: headers.get("If-None-Match"),
					token: headers.get("Authorization"),
				});
				const next = responses.shift();
				if (!next) throw new Error("Unexpected request");
				return next;
			},
			{ preconnect: globalThis.fetch.preconnect },
		),
	);
	const service = createImageService("token", async (): Promise<void> => {});
	try {
		expect(await (await service.load("id")).text()).toBe("photo");
		expect(await (await service.load("id")).text()).toBe("photo");
		expect(calls.at(1)?.etag).toBe('"file-a"');
		await expect(service.load("id")).rejects.toThrow("Photo unavailable.");
		expect(await (await service.load("id")).text()).toBe("replacement");
		expect(calls.at(3)?.etag).toBeNull();
		expect(calls.every((entry) => entry.token === "Bearer token")).toBe(true);
	} finally {
		fetchSpy.mockRestore();
		if (previousSite === undefined)
			delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
		else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = previousSite;
	}
});

test("memory cache evicts least recently used attachments and never stores an oversized file", (): void => {
	const cache = createMediaMemoryCache(5);
	cache.put("one", { blob: new Blob(["12"]), etag: '"1"' });
	cache.put("two", { blob: new Blob(["34"]), etag: '"2"' });
	expect(cache.get("one")?.etag).toBe('"1"');
	cache.put("three", { blob: new Blob(["56"]), etag: '"3"' });
	expect(cache.get("two")).toBeUndefined();
	expect(cache.get("one")?.etag).toBe('"1"');
	cache.put("big", { blob: new Blob(["123456"]), etag: '"big"' });
	expect(cache.get("big")).toBeUndefined();
});

test("memory cache also limits the number of tiny entries", (): void => {
	const cache = createMediaMemoryCache(100, 1);
	cache.put("one", { blob: new Blob(["1"]), etag: '"1"' });
	cache.put("two", { blob: new Blob(["2"]), etag: '"2"' });
	expect(cache.get("one")).toBeUndefined();
	expect(cache.get("two")?.etag).toBe('"2"');
});
