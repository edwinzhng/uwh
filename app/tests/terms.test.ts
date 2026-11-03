import { expect, test } from "bun:test";
import { normalizeTerms, termsError } from "../src/domain/terms";

test("terms input is bounded plain text and versions identify immutable editions", () => {
	const draft = {
		version: " 1.2 ",
		title: " Approved terms ",
		body: " Approved policy text ",
	};
	expect(normalizeTerms(draft)).toEqual({
		version: "1.2",
		title: "Approved terms",
		body: "Approved policy text",
	});
	expect(termsError(draft)).toBeUndefined();
	expect(termsError({ ...draft, version: "" })).toContain("version");
	expect(termsError({ ...draft, title: " " })).toContain("title");
	expect(termsError({ ...draft, body: " " })).toContain("approved policy");
	expect(termsError({ ...draft, body: "x".repeat(30001) })).toContain("30,000");
});
