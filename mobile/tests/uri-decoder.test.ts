import { expect, test } from "bun:test";
import queryString from "query-string";

test("routing decodes valid parameters and preserves malformed input without recursive recovery", (): void => {
	expect(queryString.parse("name=Jordan+Fryers&word=caf%C3%A9")).toEqual({
		name: "Jordan Fryers",
		word: "café",
	});
	const malformed = "%FF".repeat(20000);
	const start = performance.now();
	expect(queryString.parse(`value=${malformed}`).value).toBe(malformed);
	expect(performance.now() - start).toBeLessThan(1000);
	expect(queryString.parse("value=%").value).toBe("%");
});
