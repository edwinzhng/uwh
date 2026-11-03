import { expect, test } from "bun:test";
import {
	type GoalReflectionDraft,
	reflectionMatches,
	validateGoalReflection,
} from "../src/domain/goal-reflections";

const draft: GoalReflectionDraft = {
	personId: "player",
	requestId: "fixture-reflection-key",
	goal: "Pass accurately",
	expectedSteps: 0,
	note: "Passing felt easier",
	selfRating: 4,
};

test("goal check-ins require a real goal, a bounded self-rating and an available count", (): void => {
	expect(validateGoalReflection(draft)).toBeUndefined();
	for (const selfRating of [Number.NaN, 0, 6, 2.5])
		expect(validateGoalReflection({ ...draft, selfRating })).toBeDefined();
	expect(validateGoalReflection({ ...draft, goal: " " })).toBeDefined();
	expect(validateGoalReflection({ ...draft, expectedSteps: 6 })).toBeDefined();
	expect(
		validateGoalReflection({ ...draft, note: "x".repeat(1001) }),
	).toBeDefined();
});

test("idempotent replay permits the same reflection and rejects changed content", (): void => {
	expect(reflectionMatches(draft, { ...draft, note: ` ${draft.note} ` })).toBe(
		true,
	);
	expect(reflectionMatches(draft, { ...draft, selfRating: 3 })).toBe(false);
	expect(reflectionMatches(draft, { ...draft, goal: "New goal" })).toBe(false);
	expect(reflectionMatches(draft, { ...draft, note: "Changed note" })).toBe(
		false,
	);
});
