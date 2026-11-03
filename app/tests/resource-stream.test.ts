import { expect, test } from "bun:test";
import { resourceUploadStream } from "../convex/resource_stream";
import { finishResourceUpload } from "../convex/resource_upload";
import { resourceDemoBlob } from "../src/demo/resource-media-fixtures";
import { validateStoredResourceMedia } from "../src/domain/resources";

test("upload streaming sniffs a split prefix then forwards identical bytes", async (): Promise<void> => {
	const bytes = new Uint8Array(await resourceDemoBlob("video").arrayBuffer());
	const chunks = [
		bytes.slice(0, 3),
		bytes.slice(3, 7),
		bytes.slice(7, 128),
		bytes.slice(128),
	];
	const request = new Request("https://example.test/upload", {
		method: "POST",
		body: new ReadableStream<Uint8Array>({
			pull: (controller): void => {
				const chunk = chunks.shift();
				if (chunk) controller.enqueue(chunk);
				else controller.close();
			},
		}),
	});
	const result = await resourceUploadStream(request, "video");
	if (!result.ok) throw new Error(result.error);
	expect(result.mime).toBe("video/mp4");
	expect(new Uint8Array(await new Response(result.body).arrayBuffer())).toEqual(
		bytes,
	);
	expect(result.state.bytes).toBe(bytes.byteLength);
});

test("streaming bounds still reject an oversized body without a declared length", async (): Promise<void> => {
	const chunks = [
		new Uint8Array([0xff, 0xd8, 0xff, ...new Uint8Array(125)]),
		new Uint8Array(2 * 1024 * 1024),
	];
	const request = new Request("https://example.test/upload", {
		method: "POST",
		body: new ReadableStream<Uint8Array>({
			pull: (controller): void => {
				const chunk = chunks.shift();
				if (chunk) controller.enqueue(chunk);
				else controller.close();
			},
		}),
	});
	const result = await resourceUploadStream(request, "thumbnail");
	if (!result.ok) throw new Error(result.error);
	await expect(new Response(result.body).arrayBuffer()).rejects.toThrow(
		"size limit",
	);
	expect(result.state.exceeded).toBe(true);
});

test("final ingest rejects changed bytesize and signatures before registration", (): void => {
	const expected = { size: 100, mime: "video/mp4", purpose: "video" as const };
	expect(
		validateStoredResourceMedia(expected, { size: 100, mime: "video/mp4" }),
	).toBeUndefined();
	expect(
		validateStoredResourceMedia(expected, { size: 99, mime: "video/mp4" }),
	).toContain("incomplete");
	expect(
		validateStoredResourceMedia(expected, { size: 100, mime: "text/html" }),
	).toContain("signature changed");
	expect(validateStoredResourceMedia(expected, { size: 100 })).toContain(
		"signature changed",
	);
});

test("failed ingest deletes only the newly uploaded bytes and successful ingest preserves them", async (): Promise<void> => {
	const discarded: string[] = [];
	await expect(
		finishResourceUpload(
			async (): Promise<never> => {
				throw new Error("Permission revoked before registration.");
			},
			async (): Promise<void> => {
				discarded.push("new-file");
			},
		),
	).rejects.toThrow("Permission revoked");
	expect(discarded).toEqual(["new-file"]);
	expect(
		await finishResourceUpload(
			async (): Promise<string> => "registered",
			async (): Promise<void> => {
				discarded.push("registered-file");
			},
		),
	).toBe("registered");
	expect(discarded).toEqual(["new-file"]);
});
