import { expect, test } from "bun:test";
import { materialVariation } from "../src/design-system/material-variation";

test("material shapes have stable, bounded, distinct starting positions", () => {
	const names = [
		"Programs",
		"Members",
		"Fitness tests",
		"Videos",
		"/",
		"/club",
		"/schedule",
		"/conversation",
	];
	const variations = names.map(materialVariation);
	expect(new Set(variations).size).toBe(names.length);
	for (const name of names) {
		expect(materialVariation(name)).toBe(materialVariation(name));
		expect(materialVariation(name)).toBeGreaterThanOrEqual(0);
		expect(materialVariation(name)).toBeLessThan(1);
	}
});
