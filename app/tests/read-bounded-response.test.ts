import { expect, test } from "bun:test";
import { readBoundedResponse } from "../src/platform/read-bounded-response";

test("document downloads accept multiple chunks through the exact size limit", async (): Promise<void> => {
	const body = new ReadableStream<Uint8Array>({
		start: (controller): void => {
			controller.enqueue(new Uint8Array([1, 2]));
			controller.enqueue(new Uint8Array([3, 4]));
			controller.close();
		},
	});
	expect(await readBoundedResponse(new Response(body), 4)).toEqual(
		new Uint8Array([1, 2, 3, 4]),
	);
});

test("undeclared and understated downloads cancel as soon as observed bytes exceed the limit", async (): Promise<void> => {
	const variants: HeadersInit[] = [{}, { "content-length": "1" }];
	for (const headers of variants) {
		const state = { cancelled: false, read: 0 };
		const body = new ReadableStream<Uint8Array>(
			{
				pull: (controller): void => {
					state.read += 1;
					controller.enqueue(new Uint8Array(3));
				},
				cancel: (): void => {
					state.cancelled = true;
				},
			},
			{ highWaterMark: 0 },
		);
		await expect(
			readBoundedResponse(new Response(body, { headers }), 4),
		).rejects.toThrow("size limit");
		expect(state.cancelled).toBe(true);
		expect(state.read).toBe(2);
	}
});

test("oversized declarations and failed requests cancel before reading", async (): Promise<void> => {
	for (const init of [
		{ headers: { "content-length": "100" } },
		{ status: 403 },
	]) {
		const state = { cancelled: false, read: false };
		const body = new ReadableStream<Uint8Array>(
			{
				pull: (controller): void => {
					state.read = true;
					controller.close();
				},
				cancel: (): void => {
					state.cancelled = true;
				},
			},
			{ highWaterMark: 0 },
		);
		await expect(
			readBoundedResponse(new Response(body, init), 4),
		).rejects.toThrow("unavailable");
		expect(state.cancelled).toBe(true);
		expect(state.read).toBe(false);
	}
});
