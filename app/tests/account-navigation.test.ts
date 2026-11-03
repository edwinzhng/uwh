import { expect, test } from "bun:test";
import {
	accountSection,
	accountSectionParams,
	accountSections,
} from "../src/domain/account-navigation";

test("profile navigation separates fitness, goals and feedback without a separate video tab", (): void => {
	expect(accountSections.map((section) => section.value)).toEqual([
		"membership",
		"fitness",
		"goals",
		"feedback",
		"attendance",
	]);
	for (const section of accountSections) {
		const params = accountSectionParams(section.value);
		expect(accountSection(params.tab, params.feedback)).toBe(section.value);
	}
});

test("legacy progress reaches fitness and reflection links reach goals while feedback videos stay under feedback", (): void => {
	expect(accountSection("progress")).toBe("fitness");
	expect(accountSection("feedback", "self")).toBe("goals");
	expect(accountSection("feedback", "videos")).toBe("feedback");
	expect(accountSection("feedback", "coach")).toBe("feedback");
	expect(accountSection("feedback", "invalid")).toBe("feedback");
	expect(accountSection("invalid")).toBe("membership");
	expect(accountSectionParams("attendance")).toEqual({
		tab: "attendance",
		feedback: undefined,
	});
	expect(accountSectionParams("feedback")).toEqual({
		tab: "feedback",
		feedback: undefined,
	});
});
