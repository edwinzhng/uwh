import { expect, test } from "bun:test";
import { galleryScreen, galleryVariants } from "../review/screen-gallery";
import { initialAppData } from "../src/demo/app-data";
import { reviewScenarioData } from "../src/demo/review-scenario";

test("review scenarios preserve membership identity while varying activity and copy", (): void => {
	const quiet = reviewScenarioData(initialAppData, "quiet");
	expect(quiet.events).toHaveLength(0);
	expect(quiet.members).toBe(initialAppData.members);
	expect(quiet.messages).toHaveLength(0);
	const long = reviewScenarioData(initialAppData, "long");
	expect(long.members.map((member) => member.id)).toEqual(
		initialAppData.members.map((member) => member.id),
	);
	expect(long.events.at(0)?.title.length).toBeGreaterThan(60);
	expect(initialAppData.members.at(0)?.name).not.toContain("Montgomery");
	expect(reviewScenarioData(initialAppData)).toBe(initialAppData);
});

test("gallery detail routes have valid fixture identities and common tab variants", (): void => {
	expect(galleryScreen("session").href).toBe("/session?event=club-thu");
	expect(galleryScreen("conversation").href).toBe("/conversation?id=club");
	expect(
		galleryVariants.some((screen) => screen.href.includes("tab=coaching")),
	).toBe(true);
});
