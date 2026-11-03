import { expect, test } from "bun:test";
import { activeLoadingScope } from "../src/design-system/loading-state";

test("concurrent sections elect one indicator and a nested dialog takes priority", (): void => {
	expect(
		activeLoadingScope({
			a: { scopeId: "page", depth: 1 },
			b: { scopeId: "page", depth: 1 },
		}),
	).toBe("page");
	const requests = {
		a: { scopeId: "page", depth: 1 },
		dialog: { scopeId: "picker", depth: 2 },
	};
	expect(activeLoadingScope(requests)).toBe("picker");
	expect(activeLoadingScope({ a: requests.a })).toBe("page");
	expect(activeLoadingScope({})).toBeUndefined();
});

test("routine loads do not create GL views or replay a second content entrance", async (): Promise<void> => {
	const content = await Bun.file(
		"src/design-system/loading-content.tsx",
	).text();
	const boundary = await Bun.file(
		"src/design-system/loading-boundary.tsx",
	).text();
	const gate = await Bun.file("src/features/terms-gate.tsx").text();
	expect(content).not.toContain("LoadingPuck");
	expect(content).toContain("LoadingCoveredContext");
	expect(content).toContain("useScreenActive");
	expect(boundary).not.toContain("ContentReveal");
	expect(gate).not.toContain("LoadingScreen");
});
