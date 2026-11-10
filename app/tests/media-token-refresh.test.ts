import { expect, spyOn, test } from "bun:test";
import { createImageService } from "../src/backend/image-service";
import { createProfilePhotoService } from "../src/backend/profile-photo-service";
import { createPhotoUriCache } from "../src/features/photo-uri-cache";

test("cached profile photos survive token rotation while new requests use the current token", async (): Promise<void> => {
	const previousSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.invalid";
	const authorizations: (string | null)[] = [];
	const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
		Object.assign(
			async (
				_url: string | Request | URL,
				init?: RequestInit,
			): Promise<Response> => {
				authorizations.push(new Headers(init?.headers).get("Authorization"));
				return new Response(new Blob(["photo"]), { status: 200 });
			},
			{ preconnect: globalThis.fetch.preconnect },
		),
	);
	const token: { value?: string } = { value: "first" };
	const service = createProfilePhotoService(
		() => token.value,
		async (): Promise<void> => {},
	);
	const cache = createPhotoUriCache({
		load: service.load,
		createUri: async (): Promise<string> => "blob:photo",
		releaseUri: (): void => {},
	});
	try {
		expect(await cache.load("photo-1")).toBe("blob:photo");
		token.value = "second";
		expect(await cache.load("photo-1")).toBe("blob:photo");
		expect(authorizations).toEqual(["Bearer first"]);
		expect(await cache.load("photo-2")).toBe("blob:photo");
		expect(authorizations).toEqual(["Bearer first", "Bearer second"]);
		token.value = undefined;
		await expect(service.load("photo-3")).rejects.toThrow();
		expect(authorizations).toHaveLength(2);
	} finally {
		cache.clear();
		fetchSpy.mockRestore();
		if (previousSite === undefined)
			delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
		else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = previousSite;
	}
});

test("chat attachment requests use the latest token and fail closed after sign out", async (): Promise<void> => {
	const previousSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
	process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.invalid";
	const authorizations: (string | null)[] = [];
	const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
		Object.assign(
			async (
				_url: string | Request | URL,
				init?: RequestInit,
			): Promise<Response> => {
				authorizations.push(new Headers(init?.headers).get("Authorization"));
				return new Response(new Blob(["image"]), { status: 200 });
			},
			{ preconnect: globalThis.fetch.preconnect },
		),
	);
	const token: { value?: string } = { value: "first" };
	const service = createImageService(
		() => token.value,
		async (): Promise<void> => {},
	);
	try {
		await service.load("image-1");
		token.value = "second";
		await service.load("image-2");
		expect(authorizations).toEqual(["Bearer first", "Bearer second"]);
		token.value = undefined;
		await expect(service.load("image-3")).rejects.toThrow();
		expect(authorizations).toHaveLength(2);
	} finally {
		fetchSpy.mockRestore();
		if (previousSite === undefined)
			delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
		else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = previousSite;
	}
});
