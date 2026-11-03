import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppAction } from "../src/domain/app-types";
import { defaultProgramRsvp } from "../src/domain/programs";

const data = {
	...initialAppData,
	members: initialAppData.members.map((member) =>
		member.id === "sam"
			? {
					...member,
					archived: true,
					mergedInto: "mila",
					mergedAt: "2026-10-25",
				}
			: member,
	),
};
const actions: AppAction[] = [
	{ type: "set-member-archived", personId: "sam", archived: false },
	{
		type: "tracker-value",
		personId: "sam",
		trackerId: "custom",
		value: "Value",
	},
	{
		type: "save-program",
		draft: {
			id: "club",
			name: "Club",
			archived: false,
			status: "active",
			kind: "hockey",
			rsvp: defaultProgramRsvp(),
		},
		memberIds: ["sam"],
		expectedRevision: 0,
	},
	{
		type: "payment",
		payment: {
			id: "p",
			personId: "sam",
			amount: 500,
			note: "Payment",
		},
	},
	{
		type: "save-feedback",
		feedback: {
			id: "f",
			personId: "sam",
			authorId: "alex",
			body: "Draft",
			visibility: "draft",
			date: "2026-10-25",
		},
	},
	{
		type: "save-lineup",
		eventId: "club-thu",
		expectedRevision: 0,
		snapshot: {
			black: [],
			white: [],
			blackBench: [],
			whiteBench: [],
			blackFormation: "2-3-1",
			whiteFormation: "2-3-1",
			positions: [],
			referees: [{ side: "black", personId: "sam" }],
		},
	},
];
test("merged source aliases reject direct and nested stale writes", () => {
	for (const action of actions)
		expect(() => reduceApp(data, primaryAccount, action)).toThrow(
			"profile was merged",
		);
	expect(data.members.find((member) => member.id === "sam")?.archived).toBe(
		true,
	);
});
