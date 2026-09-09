import { expect, test } from "bun:test";
import { matchesQuery } from "../src/design-system/matches-query";

test("picker search handles partial names, case, accents and padded queries", () => {
	expect(matchesQuery("Sam Rivera", " river ")).toBe(true);
	expect(matchesQuery("Émilie Roy", "EMILIE")).toBe(true);
	expect(matchesQuery("Mila Rivera", "   ")).toBe(true);
	expect(matchesQuery("Mila Rivera", "sam")).toBe(false);
});
