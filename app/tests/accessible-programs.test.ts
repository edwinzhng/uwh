import { expect, test } from "bun:test";
import { accessiblePrograms } from "../src/domain/accessible-programs";
import type { Account, Member } from "../src/domain/app-types";
import { defaultProgramRsvp } from "../src/domain/programs";

const account: Account = {
	id: "parent-account",
	personId: "parent",
	name: "Parent",
	children: ["child", "archived-child"],
	coachPrograms: ["thursday"],
	admin: false,
};
const member = (id: string, programs: string[], archived = false): Member => ({
	id,
	name: id,
	programs,
	archived,
	position: "",
	rating: 0,
	registration: "approved",
	goal: "",
	steps: 0,
});
const data = {
	programs: ["sunday", "monday", "thursday", "friday", "archived"].map(
		(id) => ({
			id,
			name: id,
			revision: 1,
			archived: id === "archived",
			status: "active" as const,
			kind: "hockey" as const,
			rsvp: defaultProgramRsvp(),
		}),
	),
	members: [
		member("parent", ["sunday", "archived"]),
		member("child", ["friday"]),
		member("archived-child", ["monday"], true),
		member("unrelated", ["monday"]),
	],
};

test("program filters include active personal, household and coaching access", () => {
	expect(
		accessiblePrograms(data, account).map((program) => program.id),
	).toEqual(["sunday", "thursday", "friday"]);
});

test("admins retain every active program and unenrolled accounts get no filters", () => {
	expect(
		accessiblePrograms(data, { ...account, admin: true }).map(
			(program) => program.id,
		),
	).toEqual(["sunday", "monday", "thursday", "friday"]);
	expect(
		accessiblePrograms(data, {
			...account,
			personId: "new-member",
			children: [],
			coachPrograms: [],
		}),
	).toEqual([]);
});
