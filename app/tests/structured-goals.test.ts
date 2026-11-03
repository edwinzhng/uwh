import { expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { visibleAppData } from "../src/domain/app-visibility";
import type { GoalDetails } from "../src/domain/goals";

const details: GoalDetails = {
	category: "positioning",
	remarks: "Recover into the passing lane",
};
const player = previewAccounts.find(
	(account) =>
		!account.coachPrograms.length &&
		initialAppData.members.some(
			(member) => member.id === account.personId && member.goal,
		),
);
if (!player) throw new Error("Player fixture unavailable");
const member = initialAppData.members.find(
	(entry) => entry.id === player.personId,
);
if (!member) throw new Error("Member fixture unavailable");
test("a declined request invalidates an already-open request editor", () => {
	const pending = reduceApp(initialAppData, player, {
		type: "request-goal",
		personId: member.id,
		goal: "New focus",
		details,
		expectedRevision: 0,
		expectedPendingRevision: 0,
	});
	const declined = reduceApp(pending, primaryAccount, {
		type: "review-goal",
		personId: member.id,
		goal: "New focus",
		requestRevision: 1,
		approve: false,
	});
	expect(
		declined.members.find((entry) => entry.id === member.id)
			?.pendingGoalRevision,
	).toBe(2);
	expect(() =>
		reduceApp(declined, player, {
			type: "request-goal",
			personId: member.id,
			goal: "Recreated stale focus",
			details,
			expectedRevision: 0,
			expectedPendingRevision: 1,
		}),
	).toThrow("request changed");
});
test("structured goals preserve categories and remarks through approval", () => {
	const requested = reduceApp(initialAppData, player, {
		type: "request-goal",
		personId: member.id,
		goal: "Recover sooner",
		details,
		expectedRevision: 0,
	});
	const pending = requested.members.find((entry) => entry.id === member.id);
	expect(pending?.pendingGoalDetails).toEqual(details);
	expect(pending?.goal).toBe(member.goal);
	const approved = reduceApp(requested, primaryAccount, {
		type: "review-goal",
		personId: member.id,
		goal: "Recover sooner",
		approve: true,
		requestRevision: pending?.pendingGoalRevision,
	});
	expect(
		approved.members.find((entry) => entry.id === member.id),
	).toMatchObject({ goalDetails: details, goalRevision: 1, steps: 0 });
});
test("stale structured approval cannot approve changed remarks under the same focus", () => {
	const first = reduceApp(initialAppData, player, {
		type: "request-goal",
		personId: member.id,
		goal: "Recover sooner",
		details,
	});
	const second = reduceApp(first, player, {
		type: "request-goal",
		personId: member.id,
		goal: "Recover sooner",
		details: { ...details, remarks: "Changed remarks" },
	});
	expect(() =>
		reduceApp(second, primaryAccount, {
			type: "review-goal",
			personId: member.id,
			goal: "Recover sooner",
			approve: true,
			requestRevision: 1,
		}),
	).toThrow("changed");
	expect(() =>
		reduceApp(second, primaryAccount, {
			type: "review-goal",
			personId: member.id,
			goal: "Recover sooner",
			approve: true,
		}),
	).toThrow("changed");
});
test("goal metadata remains private and direct edits reject stale goal versions", () => {
	const saved = reduceApp(initialAppData, primaryAccount, {
		type: "set-goal",
		personId: member.id,
		goal: member.goal,
		details,
		expectedRevision: 0,
	});
	expect(() =>
		reduceApp(saved, primaryAccount, {
			type: "set-goal",
			personId: member.id,
			goal: "New focus",
			details,
			expectedRevision: 0,
		}),
	).toThrow("changed");
	const outsider = { ...player, personId: "unrelated", children: [] };
	expect(
		visibleAppData(saved, outsider).members.find(
			(entry) => entry.id === member.id,
		)?.goalDetails,
	).toBeUndefined();
	expect(
		visibleAppData(saved, player).members.find(
			(entry) => entry.id === member.id,
		)?.goalDetails,
	).toEqual(details);
});
test("pending goal edits have an independent optimistic revision", () => {
	const first = reduceApp(initialAppData, player, {
		type: "request-goal",
		personId: member.id,
		goal: "Recover sooner",
		details,
		expectedRevision: 0,
		expectedPendingRevision: 0,
	});
	expect(() =>
		reduceApp(first, player, {
			type: "request-goal",
			personId: member.id,
			goal: "Stale edit",
			details,
			expectedRevision: 0,
			expectedPendingRevision: 0,
		}),
	).toThrow("request changed");
	const next = reduceApp(first, player, {
		type: "request-goal",
		personId: member.id,
		goal: "Reviewed edit",
		details,
		expectedRevision: 0,
		expectedPendingRevision: 1,
	});
	expect(
		next.members.find((entry) => entry.id === member.id)?.pendingGoalRevision,
	).toBe(2);
});
