import { expect, test } from "bun:test";
import { primaryAccount } from "../src/demo/app-data";
import {
	canReviewSessionCheckins,
	type SessionCheckIn,
	validateSessionCheckIn,
	visibleSessionCheckins,
} from "../src/domain/session-checkins";

const entries: SessionCheckIn[] = [
	{
		eventId: "session",
		personId: "sam",
		energy: 3,
		note: "Fictional note",
		updatedAt: 0,
	},
	{ eventId: "session", personId: "taylor", energy: 4, note: "", updatedAt: 0 },
];
const parent = {
	...primaryAccount,
	id: "parent",
	personId: "jamie",
	children: ["sam"],
	admin: false,
	coachPrograms: [],
};

test("check-ins reject invalid energies and oversized notes", (): void => {
	for (const value of [0, 6, 2.5, Number.NaN])
		expect(validateSessionCheckIn(value, "")).toBeDefined();
	expect(validateSessionCheckIn(3, "x".repeat(501))).toBeDefined();
	expect(validateSessionCheckIn(3, "")).toBeUndefined();
});

test("only households and assigned session coaches can read energy check-ins", (): void => {
	expect(visibleSessionCheckins(entries, parent, [])).toEqual(
		entries.filter((entry) => entry.personId === "sam"),
	);
	expect(
		visibleSessionCheckins(entries, { ...parent, children: [] }, []),
	).toEqual([]);
	const admin = { ...parent, id: "admin", children: [], admin: true };
	expect(visibleSessionCheckins(entries, admin, [admin.id])).toEqual([]);
	const coach = { ...admin, admin: false, coachPrograms: ["club"] };
	expect(canReviewSessionCheckins(coach, [])).toBe(false);
	expect(visibleSessionCheckins(entries, coach, [coach.id])).toEqual(entries);
});
