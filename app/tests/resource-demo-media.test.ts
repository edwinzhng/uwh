import { expect, test } from "bun:test";
import {
	loadResourceDemoBlob,
	resourceDemoBlob,
	resourceDemoMedia,
} from "../src/demo/resource-media-fixtures";

test("deferred preview media preserves actual encoded files without constructing binary Blob parts", async (): Promise<void> => {
	for (const purpose of ["video", "voice", "thumbnail"] as const) {
		const blob = await loadResourceDemoBlob(purpose);
		const expected = resourceDemoBlob(purpose);
		expect(blob.type).toBe(resourceDemoMedia[purpose].mime);
		expect(blob.size).toBe(expected.size);
		expect(await blob.arrayBuffer()).toEqual(await expected.arrayBuffer());
	}
});
