import { expect, test } from "bun:test";
import { inspectDesignBoundary } from "../scripts/check-design-boundary";

test("rejects aliased native imports, raw HTML, style overrides, and internal imports", () => {
	const failures = inspectDesignBoundary(
		'import { View as Box } from "react-native"; import { Button } from "../design-system/button"; const Example = () => <div><Box style={{ padding: 16 }} /><Button className="green" /></div>;',
		"example.tsx",
	);
	expect(failures).toHaveLength(5);
});

test("accepts public components and constrained layout props", () => {
	expect(
		inspectDesignBoundary(
			'import { Stack, Text } from "../design-system"; const Example = () => <Stack gap="md"><Text variant="h1">Club</Text></Stack>;',
			"example.tsx",
		),
	).toEqual([]);
});
