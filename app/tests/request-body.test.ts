import { expect, test } from "bun:test";
import { boundedBlob } from "../convex/request_body";

test("image uploads stop at the byte limit even with a missing or false length", async (): Promise<void> => {
	const request = (): Request =>
		new Request("https://example.test", {
			method: "POST",
			headers: { "Content-Type": "image/png" },
			body: "x".repeat(11),
		});
	expect(await boundedBlob(request(), 10)).toBeUndefined();
	const spoofed = request();
	spoofed.headers.set("Content-Length", "1");
	expect(await boundedBlob(spoofed, 10)).toBeUndefined();
	const accepted = await boundedBlob(request(), 11);
	expect(accepted?.size).toBe(11);
	expect(accepted?.type).toBe("image/png");
});
