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
