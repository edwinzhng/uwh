import { expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import {
	previewAccountId,
	previewPersonId,
} from "../src/demo/preview-personas";
import { canManagePerson } from "../src/domain/app-rules";
import { canEditMemberCapNumber } from "../src/domain/member-profile";
import { canWriteSessionPerformance } from "../src/domain/session-performance";

test("preview account roles and household links match the club personas", (): void => {
	expect(
		previewAccounts.map(({ id, name, admin, coachPrograms, children }) => ({
			id,
			name,
			admin,
			coach: coachPrograms.length > 0,
			children,
		})),
	).toEqual([
		{
			id: "alex",
			name: "Jordan Fryers",
			admin: true,
			coach: true,
			children: [],
		},
		{
			id: "taylor",
			name: "Brad Smith",
			admin: false,
			coach: false,
			children: ["sam", "mila"],
		},
		{
			id: "jamie",
			name: "Alexis Smith",
			admin: false,
			coach: false,
			children: ["sam", "mila"],
		},
		{
			id: "morgan",
			name: "Ross Zariski",
			admin: true,
			coach: false,
			children: [],
		},
		{
			id: "casey",
			name: "Nathaniel Schoenberger",
			admin: false,
			coach: true,
			children: [],
		},
	]);
	const jordan = previewAccounts.find((account) => account.id === "alex");
	if (!jordan) throw new Error("Missing primary preview account.");
	expect(primaryAccount).toEqual(jordan);
});

test("two separate guardians manage the same children without granting coach or admin household authority", (): void => {
	const child = initialAppData.members.find((member) => member.id === "sam");
	const jordan = previewAccounts.find((account) => account.id === "alex");
	const ross = previewAccounts.find((account) => account.id === "morgan");
	if (!child || !jordan || !ross) throw new Error("Missing preview persona.");
	for (const account of previewAccounts.filter((entry) =>
		["jamie", "taylor"].includes(entry.id),
	)) {
		expect(canManagePerson(account, child.id)).toBe(true);
		expect(canWriteSessionPerformance(account, child, "self")).toBe(true);
		expect(canWriteSessionPerformance(account, child, "coach")).toBe(false);
		expect(canEditMemberCapNumber(account, child)).toBe(false);
	}
	expect(canManagePerson(jordan, child.id)).toBe(false);
	expect(canWriteSessionPerformance(jordan, child, "self")).toBe(false);
	expect(canWriteSessionPerformance(jordan, child, "coach")).toBe(true);
	expect(canEditMemberCapNumber(ross, child)).toBe(false);
});

test("review aliases resolve stable identities without granting another household profile", (): void => {
	for (const [alias, id] of [
		["jordan-fryers", "alex"],
		["nathaniel-schoenberger", "casey"],
		["ross-zariski", "morgan"],
		["alexis-smith", "jamie"],
		["brad-smith", "taylor"],
	])
		expect(previewAccountId(alias)).toBe(id);
	expect(previewPersonId("rylan-smith")).toBe("sam");
	expect(previewPersonId("blake-smith")).toBe("mila");
	expect(previewPersonId("rylan")).toBe("sam");
	expect(previewPersonId("blake")).toBe("mila");
	const jordan = previewAccounts.find(
		(account) => account.id === previewAccountId("jordan-fryers"),
	);
	const brad = previewAccounts.find(
		(account) => account.id === previewAccountId("brad-smith"),
	);
	const childId = previewPersonId("rylan-smith");
	if (!jordan || !brad || !childId) throw new Error("Missing review aliases.");
	expect(canManagePerson(jordan, childId)).toBe(false);
	expect(canManagePerson(brad, childId)).toBe(true);
	expect(
		previewAccounts.some(
			(account) => account.id === previewAccountId("unknown-person"),
		),
	).toBe(false);
	expect(
		initialAppData.members.find((member) => member.id === "taylor")?.programs,
	).toEqual([]);
	expect(
		initialAppData.members.find((member) => member.id === "morgan")?.programs,
	).toContain("club");
});
