import { expect, test } from "bun:test";
import { primaryAccount } from "../src/demo/app-data";
import { clubToolGroups } from "../src/domain/club-navigation";
import { feedbackSection } from "../src/domain/feedback-navigation";

test("members retain people, swim tests, videos and documents without management tools", (): void => {
	const groups = clubToolGroups({
		...primaryAccount,
		admin: false,
		coachPrograms: [],
	});
	expect(groups.flatMap((group) => group.tools)).toEqual([
		"programs",
		"members",
		"fitness",
		"videos",
		"documents",
		"announcements",
	]);
	expect(groups.map((group) => group.title)).toEqual(["Club"]);
	expect(groups.at(0)?.tools).toEqual([
		"programs",
		"members",
		"fitness",
		"videos",
		"documents",
		"announcements",
	]);
});

test("coaches retain assignment and review entry points without administrator tools", (): void => {
	const tools = clubToolGroups({
		...primaryAccount,
		admin: false,
		coachPrograms: ["club"],
	}).flatMap((group) => group.tools);
	expect(tools).toContain("coaching");
	expect(tools).toContain("reviews");
	expect(tools).toContain("hours");
	expect(tools).toContain("attendance");
	expect(tools).not.toContain("imports");
});

test("administrators without coaching programs can find assignments but not coaching reviews", (): void => {
	const tools = clubToolGroups({
		...primaryAccount,
		admin: true,
		coachPrograms: [],
	}).flatMap((group) => group.tools);
	expect(tools).toContain("hours");
	expect(tools).toContain("imports");
	expect(tools).not.toContain("reviews");
	expect(tools).not.toContain("attendance");
	expect(new Set(tools).size).toBe(tools.length);
});

test("feedback deep links validate their section without changing the parent tab", (): void => {
	expect(feedbackSection("videos")).toBe("videos");
	expect(feedbackSection("self")).toBe("self");
	expect(feedbackSection("coach")).toBe("coach");
	expect(feedbackSection("admin")).toBe("coach");
	expect(feedbackSection(undefined, "self")).toBe("self");
});

test("club resources share the primary group and equipment remains available to administrators", (): void => {
	const groups = clubToolGroups(primaryAccount);
	expect(groups.map((group) => group.title)).toEqual([
		"Club",
		"Coaching",
		"Administration",
	]);
	expect(groups.at(0)?.tools).toContain("equipment");
	expect(groups.at(0)?.tools).toEqual(
		expect.arrayContaining(["videos", "documents", "announcements"]),
	);
	expect(
		groups
			.flatMap((group) => group.tools)
			.filter((tool) => tool === "equipment"),
	).toHaveLength(1);
});
