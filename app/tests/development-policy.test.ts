import { expect, test } from "bun:test";
import {
	defaultDevelopmentPolicy,
	developmentReviewers,
	validateDevelopmentPolicy,
} from "../src/domain/development-policy";

const coaches = [
	{ id: "regular", name: "Regular coach" },
	{ id: "backup", name: "Backup coach" },
	{ id: "both", name: "Coach and backup" },
];
test("regular reviewer policy recovers from formerly selected coaches", () => {
	expect(
		validateDevelopmentPolicy(
			{ revision: 2, mode: "regular", reviewerIds: ["former"] },
			coaches,
		),
	).toBeUndefined();
});
test("regular review policy excludes only backup-only coaches", () => {
	expect(
		developmentReviewers(
			coaches,
			defaultDevelopmentPolicy(),
			["backup", "both"],
			["regular", "both"],
		).map((coach) => coach.id),
	).toEqual(["regular", "both"]);
});
test("explicit review policy supports a required subset without granting coaching permissions", () => {
	const policy = {
		revision: 1,
		mode: "selected",
		reviewerIds: ["backup", "outsider"],
	} as const;
	expect(
		developmentReviewers(
			coaches,
			{ ...policy, reviewerIds: [...policy.reviewerIds] },
			[],
			[],
		).map((coach) => coach.id),
	).toEqual(["backup"]);
	expect(
		validateDevelopmentPolicy(
			{ ...policy, reviewerIds: [...policy.reviewerIds] },
			coaches,
		),
	).toContain("current club coaches");
	expect(
		validateDevelopmentPolicy(
			{ revision: 0, mode: "selected", reviewerIds: [] },
			coaches,
		),
	).toContain("at least one");
});
