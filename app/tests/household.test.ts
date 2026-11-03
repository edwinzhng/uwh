import { expect, test } from "bun:test";
import { createStore } from "jotai";
import {
	previewAccountAtom,
	previewAccountIdAtom,
	previewDataAtom,
	selectedPersonAtom,
} from "../src/demo/app-state";
import {
	previewHouseholdAccounts,
	previewHouseholdLinks,
} from "../src/demo/household-data";
import {
	previewHouseholdCommand,
	previewHouseholdState,
} from "../src/demo/household-state";
import type { Account, Member } from "../src/domain/app-types";
import { householdDefault, householdNameError } from "../src/domain/household";

test("default profiles are limited to current active household links", (): void => {
	const account: Account = {
		id: "parent",
		personId: "parent",
		name: "Parent",
		children: ["child"],
		defaultPersonId: "child",
		coachPrograms: [],
		admin: false,
	};
	const child: Member = {
		id: "child",
		name: "Child",
		programs: [],
		position: "",
		rating: 0,
		registration: "missing",
		goal: "",
		steps: 0,
	};
	expect(householdDefault(account, [child])).toBe("child");
	expect(householdDefault({ ...account, children: [] }, [child])).toBe(
		"parent",
	);
	expect(householdDefault(account, [{ ...child, archived: true }])).toBe(
		"parent",
	);
	expect(
		householdDefault(account, [{ ...child, mergedInto: "canonical" }]),
	).toBe("parent");
	expect(householdNameError(" ")).toBeDefined();
	expect(householdNameError("Fictional dependent")).toBeUndefined();
});

test("dependent creation is explicit, private, replay-safe and grants no programs or staff access", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "taylor");
	const before = store.get(previewAccountAtom);
	const command = {
		type: "create" as const,
		name: "Fictional child",
		key: "household-create-123456789",
	};
	store.set(previewHouseholdCommand, command);
	store.set(previewHouseholdCommand, command);
	const actor = store.get(previewAccountAtom);
	const id = actor.children.find(
		(personId) => !before.children.includes(personId),
	);
	expect(id).toBeDefined();
	expect(actor.children).toHaveLength(before.children.length + 1);
	expect(actor.admin).toBe(before.admin);
	expect(actor.coachPrograms).toEqual(before.coachPrograms);
	expect(
		store.get(previewDataAtom).members.find((row) => row.id === id),
	).toMatchObject({
		name: command.name,
		programs: [],
		registration: "missing",
		rating: 0,
	});
	expect(() =>
		store.set(previewHouseholdCommand, { ...command, name: "Changed retry" }),
	).toThrow("already used");
	if (!id) throw new Error("Dependent unavailable.");
	store.set(previewHouseholdCommand, { type: "default", personId: id });
	expect(store.get(previewAccountAtom).defaultPersonId).toBe(id);
	expect(store.get(selectedPersonAtom)).toBe(id);
	store.set(previewHouseholdCommand, { type: "unlink", personId: id });
	expect(store.get(previewAccountAtom).children).toEqual(before.children);
	expect(store.get(previewDataAtom).members.some((row) => row.id === id)).toBe(
		true,
	);
	expect(store.get(previewHouseholdState).available).toHaveLength(1);
	expect(store.get(previewAccountAtom).defaultPersonId).toBe(before.personId);
	const invitation = store.get(previewHouseholdState).available.at(0);
	if (!invitation) throw new Error("Relink proof unavailable.");
	store.set(previewAccountIdAtom, "jamie");
	expect(() =>
		store.set(previewHouseholdCommand, { type: "accept", id: invitation.id }),
	).toThrow("unavailable");
	store.set(previewAccountIdAtom, "taylor");
	store.set(previewHouseholdCommand, { type: "accept", id: invitation.id });
	expect(store.get(previewAccountAtom).children).toEqual([
		...before.children,
		id,
	]);
	expect(() =>
		store.set(previewHouseholdCommand, {
			type: "unlink",
			personId: before.personId,
		}),
	).toThrow("login identity");
});

test("existing profile claims require a targeted administrator proof and current recipient identity", (): void => {
	const store = createStore();
	store.set(previewHouseholdAccounts, { taylor: { children: [] } });
	const invitation = {
		type: "invite" as const,
		personId: "sam",
		accountId: "taylor",
		key: "guardian-invite-123456789",
	};
	store.set(previewHouseholdCommand, invitation);
	const proof = store.get(previewHouseholdLinks).at(0);
	if (!proof) throw new Error("Invitation unavailable.");
	store.set(previewAccountIdAtom, "jamie");
	expect(() =>
		store.set(previewHouseholdCommand, { type: "accept", id: proof.id }),
	).toThrow("unavailable");
	expect(() =>
		store.set(previewHouseholdCommand, {
			...invitation,
			key: "non-admin-key-123456789",
		}),
	).toThrow("Administrator");
	store.set(previewAccountIdAtom, "taylor");
	expect(() =>
		store.set(previewHouseholdCommand, { type: "accept", id: "sam" }),
	).toThrow("unavailable");
	store.set(previewHouseholdCommand, { type: "accept", id: proof.id });
	store.set(previewHouseholdCommand, { type: "accept", id: proof.id });
	expect(store.get(previewAccountAtom).children).toEqual(["sam"]);
	expect(store.get(previewAccountAtom).admin).toBe(false);
	expect(store.get(previewAccountAtom).coachPrograms).toEqual([]);
	store.set(previewHouseholdLinks, (links) =>
		links.map((row) => ({ ...row, state: "revoked" })),
	);
	store.set(previewHouseholdAccounts, { taylor: { children: [] } });
	expect(() =>
		store.set(previewHouseholdCommand, { type: "accept", id: proof.id }),
	).toThrow("unavailable");
});

test("unlink remains available at the receipt limit without creating another claim proof", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "taylor");
	store.set(previewHouseholdAccounts, {
		taylor: { children: ["sam"], defaultPersonId: "sam" },
	});
	store.set(
		previewHouseholdLinks,
		Array.from({ length: 100 }, (_, index) => ({
			id: `proof:${index}`,
			userId: "taylor",
			personId: `old-dependent:${index}`,
			createdBy: "taylor",
			origin: "previous",
			state: "revoked",
			key: `proof:${index}`,
			payload: `old-dependent:${index}`,
		})),
	);
	store.set(previewHouseholdCommand, { type: "unlink", personId: "sam" });
	expect(store.get(previewHouseholdLinks)).toHaveLength(100);
	expect(store.get(previewAccountAtom).children).toEqual([]);
	expect(store.get(previewAccountAtom).defaultPersonId).toBe("taylor");
	expect(
		store.get(previewDataAtom).members.some((person) => person.id === "sam"),
	).toBe(true);
	expect(() =>
		store.set(previewHouseholdCommand, { type: "unlink", personId: "sam" }),
	).toThrow("current dependent");
});
