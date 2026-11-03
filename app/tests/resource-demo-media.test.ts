import { expect, test } from "bun:test";
import {
	loadResourceDemoBlob,
	resourceDemoBlob,
	resourceDemoMedia,
} from "../src/demo/resource-media-fixtures";

test("deferred preview media preserves actual encoded files without constructing binary Blob parts", async (): Promise<void> => {
	for (const purpose of ["document", "video", "voice", "thumbnail"] as const) {
		const blob = await loadResourceDemoBlob(purpose);
		const expected = resourceDemoBlob(purpose);
		expect(blob.type).toBe(resourceDemoMedia[purpose].mime);
		expect(blob.size).toBe(expected.size);
		expect(await blob.arrayBuffer()).toEqual(await expected.arrayBuffer());
	}
});

test("preview PDF includes a real page and readable sample content", async () => {
	const text = await (await loadResourceDemoBlob("document")).text();
	expect(text.startsWith("%PDF-1.4")).toBe(true);
	expect(text).toContain("/Type /Page ");
	expect(text).toContain("Practice reference - sample");
	expect(text).toContain("startxref");
	expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
});
