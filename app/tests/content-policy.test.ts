import { expect, test } from "bun:test";
import { contentPolicyError } from "../src/domain/content-policy";
import { submittedContentText } from "../src/domain/content-report";

test("baseline threats are filtered even before a club configures phrases", (): void => {
	expect(contentPolicyError("I WILL KILL YOU")).toBeDefined();
	expect(contentPolicyError("ki\u200Bll yourself")).toBeDefined();
	expect(contentPolicyError("Great passing practice")).toBeUndefined();
});

test("club phrases normalize case, compatibility characters and invisible separators", (): void => {
	expect(contentPolicyError("ＢＡＤ phrase", ["bad phrase"])).toBeDefined();
	expect(contentPolicyError("Keep training", ["unrelated"])).toBeUndefined();
});

test("shared action text extraction checks nested human text without filtering identity keys", (): void => {
	expect(
		submittedContentText({
			type: "save-feedback",
			feedback: {
				body: "A comment",
				authorId: "blocked phrase",
				id: "opaque-id",
			},
			draft: {
				title: "Training",
				description: "Practice",
				names: [{ name: "Alex" }],
			},
		}),
	).toEqual(["A comment", "Training", "Practice", "Alex"]);
});
