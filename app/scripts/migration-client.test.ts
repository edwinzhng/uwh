import { expect, test } from "bun:test";
import { migrationActorKey } from "./migration-client";
import type { MigrationPerson } from "./migration-source";

const person = (id: string, name: string, email: string): MigrationPerson => ({
	id,
	name,
	base: [{ id, full_name: name, email }],
	legacy: [],
	roster: [],
	registrations: [],
});
const people = [
	person("one", "Player One", "one@example.test"),
	person("two", "Player Two", "two@example.test"),
];

test("historical communication authors require a known email rather than a matching display name", (): void => {
	expect(migrationActorKey(people, "Player One", "one@example.test")).toBe(
		"one",
	);
	expect(
		migrationActorKey(people, "Player One", "relay@example.test"),
	).not.toBe("one");
	expect(migrationActorKey(people, "Player One", "relay@example.test")).toBe(
		migrationActorKey(people, "Old name", "relay@example.test"),
	);
	expect(() =>
		migrationActorKey(people, "Player Two", "one@example.test"),
	).toThrow("disagree");
});

test("a shared contact email never arbitrarily grants one source participant another person's identity", (): void => {
	const family = [
		person("one", "Player One", "family@example.test"),
		person("two", "Player Two", "family@example.test"),
	];
	expect(migrationActorKey(family, "Player Two", "family@example.test")).toBe(
		"two",
	);
	expect(migrationActorKey(family, "Family", "family@example.test")).not.toBe(
		"one",
	);
	expect(migrationActorKey(family, "Family", "family@example.test")).not.toBe(
		"two",
	);
});
