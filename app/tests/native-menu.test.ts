import { expect, test } from "bun:test";
import { loadAvailableMenu } from "../src/design-system/native-menu-policy";

test("missing native menu modules never execute their throwing import and use the shared fallback", (): void => {
	const calls: string[] = [];
	expect(
		loadAvailableMenu(false, () => {
			calls.push("loaded");
			throw new Error("Cannot find native module ExpoUI");
		}),
	).toBeUndefined();
	expect(calls).toEqual([]);
	expect(
		loadAvailableMenu(true, () => {
			throw new Error("Native menu incompatible");
		}),
	).toBeUndefined();
	const component = { name: "NativeMenu" };
	expect(loadAvailableMenu(true, () => component)).toBe(component);
});

test("native menu adapters cannot eagerly import ExpoUI before capability checks", async (): Promise<void> => {
	for (const name of ["action-menu", "select"]) {
		const source = await Bun.file(
			`src/design-system/${name}-native.tsx`,
		).text();
		expect(source).not.toMatch(
			/import\s*\{[^}]*\bMenuView\b[^}]*\}\s*from\s*["']@expo\/ui/u,
		);
		expect(source).toMatch(/if\s*\(\s*!NativeMenuView/);
		for (const platform of ["ios", "android"]) {
			const adapter = await Bun.file(
				`src/design-system/${name}.${platform}.tsx`,
			).text();
			expect(adapter).toContain(`from "./${name}-native"`);
		}
	}
});
