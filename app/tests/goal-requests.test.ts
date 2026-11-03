import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";

const player = {
	...primaryAccount,
	id: "sam",
	personId: "sam",
	children: [],
	coachPrograms: [],
	admin: false,
};
const request = {
	type: "request-goal",
	personId: "sam",
	goal: "Improve passing accuracy",
} as const;
test("players propose changes without changing the approved goal", () => {
	const next = reduceApp(initialAppData, player, request);
	expect(next.members.find((p) => p.id === "sam")?.goal).toBe(
		initialAppData.members.find((p) => p.id === "sam")?.goal,
	);
	expect(next.members.find((p) => p.id === "sam")?.pendingGoal).toBe(
		request.goal,
	);
	expect(() =>
		reduceApp(initialAppData, player, { ...request, personId: "mila" }),
	).toThrow();
});
test("coach approval applies only the reviewed request", () => {
	const next = reduceApp(initialAppData, player, request);
	const review = {
		type: "review-goal",
		personId: "sam",
		goal: request.goal,
		approve: true,
	} as const;
	expect(() => reduceApp(next, player, review)).toThrow();
	expect(() =>
		reduceApp(next, primaryAccount, { ...review, goal: "Stale goal" }),
	).toThrow();
	const approved = reduceApp(next, primaryAccount, review).members.find(
		(p) => p.id === "sam",
	);
	expect(approved?.goal).toBe(request.goal);
	expect(approved?.pendingGoal).toBeUndefined();
	const declined = reduceApp(next, primaryAccount, {
		...review,
		approve: false,
	}).members.find((p) => p.id === "sam");
	expect(declined?.goal).toBe(
		initialAppData.members.find((p) => p.id === "sam")?.goal,
	);
	expect(declined?.pendingGoal).toBeUndefined();
});

test("approving a new goal resets completed check-ins while declining preserves progress", (): void => {
	const completed = {
		...initialAppData,
		members: initialAppData.members.map((member) =>
			member.id === "sam" ? { ...member, steps: 6 } : member,
		),
	};
	const requested = reduceApp(completed, player, request);
	const review = {
		type: "review-goal",
		personId: "sam",
		goal: request.goal,
		approve: true,
	} as const;
	const approved = reduceApp(requested, primaryAccount, review).members.find(
		(member) => member.id === "sam",
	);
	expect(approved?.goal).toBe(request.goal);
	expect(approved?.steps).toBe(0);
	const declined = reduceApp(requested, primaryAccount, {
		...review,
		approve: false,
	}).members.find((member) => member.id === "sam");
	expect(declined?.goal).toBe(
		completed.members.find((member) => member.id === "sam")?.goal,
	);
	expect(declined?.steps).toBe(6);
});
