import { expect, test } from "bun:test";
import {
	accountSection,
	accountSectionParams,
	accountSections,
} from "../src/domain/account-navigation";

test("one phone profile menu reaches every section without a second tab row", (): void => {
	expect(accountSections.map((section) => section.value)).toEqual([
		"membership",
		"progress",
		"coach",
		"self",
		"videos",
		"attendance",
	]);
	for (const section of accountSections) {
		const params = accountSectionParams(section.value);
		expect(accountSection(params.tab, params.feedback)).toBe(section.value);
	}
});

test("profile navigation keeps existing deep links and clears stale feedback context", (): void => {
	expect(accountSection("feedback", "videos")).toBe("videos");
	expect(accountSection("feedback", "invalid")).toBe("coach");
	expect(accountSection("invalid")).toBe("membership");
	expect(accountSectionParams("attendance")).toEqual({
		tab: "attendance",
		feedback: undefined,
	});
});
