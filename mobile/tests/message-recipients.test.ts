import { expect, test } from "bun:test";
import type { Account } from "../src/domain/app-types";
import { recipientDirectory } from "../src/domain/message-recipients";

const accounts: Account[] = [
	{
		id: "self",
		name: "Self",
		personId: "a",
		children: [],
		admin: true,
		coachPrograms: [],
	},
	{
		id: "parent",
		name: "Jamie",
		personId: "b",
		children: ["c"],
		admin: false,
		coachPrograms: [],
	},
];
const players = [
	{ id: "a", name: "Self" },
	{ id: "b", name: "Jamie" },
	{ id: "c", name: "Sam" },
	{ id: "d", name: "Unconnected player" },
];
test("all other member profiles are messageable including those awaiting connection", () => {
	const result = recipientDirectory(accounts, players, "self", [], false);
	expect(result.recipients.map((entry) => entry.id).toSorted()).toEqual([
		"person:b",
		"person:c",
		"person:d",
	]);
	expect(result.recipients.find((entry) => entry.id === "person:c")?.name).toBe(
		"Sam",
	);
});
test("roster recipients are person identities, never invented login accounts", () => {
	const result = recipientDirectory(
		accounts.slice(0, 1),
		players,
		"self",
		[],
		false,
	);
	expect(result.recipients.map((entry) => entry.id)).toEqual([
		"person:b",
		"person:c",
		"person:d",
	]);
});
test("blocked and restricted linked accounts hide their member recipients", () => {
	expect(
		recipientDirectory(
			accounts,
			players,
			"self",
			["parent"],
			false,
		).recipients.map((entry) => entry.id),
	).toEqual(["person:d"]);
});
test("paused actor cannot select recipients", () => {
	expect(
		recipientDirectory(accounts, players, "self", [], true).recipients,
	).toEqual([]);
});

test("connected accounts with no matching roster profile remain messageable", () => {
	const result = recipientDirectory(
		[
			...accounts,
			{
				id: "orphan",
				name: "Coach account",
				personId: "missing",
				children: [],
				admin: false,
				coachPrograms: ["club"],
			},
		],
		players,
		"self",
		[],
		false,
	);
	expect(
		result.recipients.some(
			(entry) => entry.id === "orphan" && entry.name === "Coach account",
		),
	).toBe(true);
});
