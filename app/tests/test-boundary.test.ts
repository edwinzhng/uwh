import { expect, test } from "bun:test";
import { inspectTestBoundary } from "../scripts/check-test-boundary";

test("test lint rejects product-source snapshots while allowing fixture and generated-output reads", (): void => {
	expect(
		inspectTestBoundary(
			`const source = await Bun.file(\`src/features/\${name}.tsx\`).text();`,
			"fixture.test.ts",
		),
	).toHaveLength(1);
	expect(
		inspectTestBoundary(
			'const source = await Bun.file("src/features/editor.tsx").text(); expect(source).toContain("onPress");',
			"fixture.test.ts",
		),
	).toHaveLength(1);
	expect(
		inspectTestBoundary(
			'const output = await Bun.file("fixtures/output.html").text(); expect(output).toContain("Saved");',
			"fixture.test.ts",
		),
	).toEqual([]);
	expect(
		inspectTestBoundary(
			'import {submit} from "../src/features/editor"; expect(await submit()).toEqual({saved: true});',
			"fixture.test.ts",
		),
	).toEqual([]);
});
