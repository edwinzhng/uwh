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
