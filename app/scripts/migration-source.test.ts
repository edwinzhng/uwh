import { expect, test } from "bun:test";
import {
	type LegacyPlayer,
	type MigrationPerson,
	migrationMember,
	migrationPeople,
} from "./migration-source";

const legacy = (
	id: string,
	name: string,
	sporteasyId?: number,
): LegacyPlayer => ({ _id: id, fullName: name, rating: 50, sporteasyId });
const profile = (
	overrides: Partial<MigrationPerson> = {},
): MigrationPerson => ({
	id: "fixture-person",
	name: "Player One",
	base: [],
	legacy: [],
	roster: [],
	registrations: [],
	...overrides,
});

test("exact SportEasy IDs connect different source names without duplicate output people", (): void => {
	const result = migrationPeople(
		[{ id: "base", full_name: "Changed Name", sporteasy_id: "123" }],
		[legacy("legacy", "Original Name", 123)],
		[{ A: "Name", B: "Current", _sporteasyId: "123" }],
		[],
	);
	expect(result).toHaveLength(1);
	expect(result.at(0)?.base).toHaveLength(1);
	expect(result.at(0)?.legacy).toHaveLength(1);
	expect(result.at(0)?.roster).toHaveLength(1);
});

test("same-name records with different stable SportEasy IDs never merge", (): void => {
	expect(() =>
		migrationPeople(
			[{ id: "base", full_name: "Player One", sporteasy_id: "999" }],
			[legacy("legacy", "Player One", 123)],
			[],
			[],
		),
	).toThrow("Conflicting SportEasy identity");
	const result = migrationPeople(
		[{ id: "base", full_name: "Player Two", sporteasy_id: "999" }],
		[legacy("legacy", "Player One", 123)],
		[],
		[],
	);
	expect(result).toHaveLength(2);
});

test("same-source name collisions require an explicit group of source IDs", (): void => {
	const records = [
		legacy("oliver-a", "Oliver VanderZande"),
		legacy("oliver-b", "Oliver VanderZande"),
	];
	expect(() => migrationPeople([], records, [], [])).toThrow(
		"Unapproved same-source identity collision",
	);
	const result = migrationPeople(
		[],
		records,
		[],
		[],
		[["legacy:oliver-a", "legacy:oliver-b"]],
	);
	expect(result).toHaveLength(1);
	expect(result.at(0)?.legacy).toHaveLength(2);
	expect(() =>
		migrationPeople(
			[],
			[...records, legacy("not-approved", "Oliver VanderZande")],
			[],
			[],
			[["legacy:oliver-a", "legacy:oliver-b"]],
		),
	).toThrow("Unapproved same-source identity collision");
});

test("approved aliases still match across sources and strong ID/name conflicts are rejected", (): void => {
	const alias = migrationPeople(
		[{ id: "base", full_name: "David Randall" }],
		[legacy("legacy", "Dave Randall")],
		[],
		[],
	);
	expect(alias).toHaveLength(1);
	expect(() =>
		migrationPeople(
			[{ id: "base", full_name: "Player Two", sporteasy_id: "123" }],
			[legacy("one", "Player One", 123), legacy("two", "Player Two", 456)],
			[],
			[],
		),
	).toThrow("Conflicting source identity");
});

test("only an explicitly approved historical duplicate pair can combine different SportEasy IDs", (): void => {
	const records = [
		legacy("oliver-a", "Oliver VanderZande", 123),
		legacy("oliver-b", "Oliver VanderZande", 456),
	];
	const approval = [["legacy:oliver-a", "legacy:oliver-b"]];
	expect(() => migrationPeople([], records, [], [])).toThrow(
		"Conflicting SportEasy identity",
	);
	const result = migrationPeople(
		[{ id: "base", full_name: "Oliver VanderZande", sporteasy_id: "123" }],
		records,
		[{ A: "VanderZande", B: "Oliver", _sporteasyId: "456" }],
		[],
		approval,
	);
	expect(result).toHaveLength(1);
	expect(result.at(0)?.legacy).toHaveLength(2);
	expect(result.at(0)?.base).toHaveLength(1);
	expect(result.at(0)?.roster).toHaveLength(1);
	expect(() =>
		migrationPeople(
			[{ id: "new", full_name: "Oliver VanderZande", sporteasy_id: "999" }],
			records,
			[],
			[],
			approval,
		),
	).toThrow("Conflicting SportEasy identity");
	expect(() =>
		migrationPeople(
			[],
			[...records, legacy("unapproved", "Oliver VanderZande", 789)],
			[],
			[],
			approval,
		),
	).toThrow("Conflicting SportEasy identity");
});

test("unknown ratings are explicit and actual source zero is not replaced", (): void => {
	const unknown = migrationMember(profile());
	expect(unknown.rating).toBe(0);
	expect(unknown).toHaveProperty("ratingKnown", false);
	const knownZero = migrationMember(profile({ base: [{ skill_score: "0" }] }));
	expect(knownZero.rating).toBe(0);
	expect(knownZero).not.toHaveProperty("ratingKnown", false);
	const knownLegacy = migrationMember(
		profile({ legacy: [{ ...legacy("legacy", "Player One"), rating: 89 }] }),
	);
	expect(knownLegacy.rating).toBe(89);
	expect(knownLegacy).not.toHaveProperty("ratingKnown", false);
});

test("an explicitly approved old legacy identity can use its verified current live SportEasy ID", (): void => {
	const records = [legacy("old-profile", "Player One", 111)];
	const approvals = [["legacy:old-profile", "sporteasy:222"]];
	const result = migrationPeople(
		[{ id: "base", full_name: "Player One", sporteasy_id: "222" }],
		records,
		[{ A: "One", B: "Player", _sporteasyId: "222" }],
		[],
		approvals,
	);
	expect(result).toHaveLength(1);
	expect(result.at(0)?.base).toHaveLength(1);
	expect(result.at(0)?.roster).toHaveLength(1);
	const noBaseStrongId = migrationPeople(
		[{ id: "base", full_name: "Player One" }],
		records,
		[{ A: "One", B: "Player", _sporteasyId: "222" }],
		[],
		approvals,
	);
	expect(noBaseStrongId).toHaveLength(1);
	expect(noBaseStrongId.at(0)?.base).toHaveLength(1);
	expect(noBaseStrongId.at(0)?.roster).toHaveLength(1);
	expect(() =>
		migrationPeople(
			[{ id: "other", full_name: "Player One", sporteasy_id: "333" }],
			records,
			[],
			[],
			approvals,
		),
	).toThrow("Conflicting SportEasy identity");
});

test("calendar migration derives RSVP state from the fixed captured snapshot clock, not execution time", async (): Promise<void> => {
	const source = await Bun.file(
		new URL("./migration-source.ts", import.meta.url),
	).text();
	expect(source).toContain('capturedAt = Date.parse("2026-11-01T00:00:00Z")');
	expect(source).toContain('signup: end <= capturedAt ? "closed" : "open"');
	expect(source).not.toContain("Date.now()");
});

test("empty Base44 positions retain known legacy positions while populated current positions take precedence", (): void => {
	const history = [{ ...legacy("legacy", "Player One"), positions: ["RF"] }];
	expect(
		migrationMember(profile({ base: [{ positions: "[]" }], legacy: history }))
			.position,
	).toBe("FORWARD");
	expect(
		migrationMember(profile({ base: [{ positions: "" }], legacy: history }))
			.position,
	).toBe("FORWARD");
	expect(
		migrationMember(
			profile({ base: [{ positions: '["LW"]' }], legacy: history }),
		).position,
	).toBe("WING");
});
