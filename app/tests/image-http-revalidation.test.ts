import { expect, test } from "bun:test";
import type { ActionCtx } from "../convex/_generated/server";
import { downloadImage } from "../convex/image_http";

const fixture = {
	_id: "image-id",
	storageId: "stored-file",
	mime: "image/jpeg",
	name: "photo.jpg",
};
const request = (etag?: string): Request =>
	new Request("https://example.invalid/images?id=image-id", {
		headers: etag ? { "If-None-Match": etag } : {},
	});
const context = (
	signedIn: boolean,
	readable: boolean,
): { ctx: ActionCtx; reads: { queries: number; blobs: number } } => {
	const reads = { queries: 0, blobs: 0 };
	const ctx = {
		runQuery: async (): Promise<string | typeof fixture | null> => {
			reads.queries += 1;
			return reads.queries === 1
				? signedIn
					? "test-user"
					: null
				: readable
					? fixture
					: null;
		},
		storage: {
			get: async (): Promise<Blob> => {
				reads.blobs += 1;
				return new Blob(["image"]);
			},
		},
	} as unknown as ActionCtx;
	return { ctx, reads };
};
test("conditional downloads require authentication and current access before returning cached content", async (): Promise<void> => {
	const signedOut = context(false, true);
	expect(
		(await downloadImage(signedOut.ctx, request('"image-id"'))).status,
	).toBe(401);
	expect(signedOut.reads).toEqual({ queries: 1, blobs: 0 });
	const revoked = context(true, false);
	expect((await downloadImage(revoked.ctx, request('"image-id"'))).status).toBe(
		404,
	);
	expect(revoked.reads).toEqual({ queries: 2, blobs: 0 });
	const permitted = context(true, true);
	const unchanged = await downloadImage(permitted.ctx, request('"image-id"'));
	expect(unchanged.status).toBe(304);
	expect(unchanged.headers.get("ETag")).toBe('"image-id"');
	expect(permitted.reads).toEqual({ queries: 2, blobs: 0 });
	const fresh = context(true, true);
	const response = await downloadImage(fresh.ctx, request());
	expect(response.status).toBe(200);
	expect(response.headers.get("ETag")).toBe('"image-id"');
	expect(await response.text()).toBe("image");
	expect(fresh.reads).toEqual({ queries: 2, blobs: 1 });
});
