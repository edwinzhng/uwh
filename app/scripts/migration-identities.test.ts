import { describe, expect, test } from "bun:test";
import {
	migrationName,
	proposeMigrationIdentity,
} from "./migration-identities";

describe("migration identity proposals", () => {
	test("retains both histories only when their exact source IDs were approved", () => {
		const people = [
			{ source: "legacy", sourceId: "first", name: "Oliver VanderZande" },
			{ source: "legacy", sourceId: "second", name: "Oliver VanderZande" },
		] satisfies Parameters<typeof proposeMigrationIdentity>[1];
		const proposal = proposeMigrationIdentity(
			{ source: "registration", sourceId: "r1", name: "Oliver VanderZande" },
			people,
			[["legacy:first", "legacy:second"]],
		);
		expect(proposal.status).toBe("match");
		expect(proposal.candidates).toHaveLength(2);
		expect(proposeMigrationIdentity(proposal.person, people).status).toBe(
			"review",
		);
	});
	test("uses only the three explicitly approved aliases", () => {
		expect(migrationName("David Randall")).toBe("dave randall");
		expect(migrationName("Erika Rovira")).toBe("erika rov");
		expect(migrationName("Joseph Wernikowski")).toBe("joe wernikowski");
		expect(migrationName("David Smith")).not.toBe(migrationName("Dave Smith"));
	});
	test("does not collapse duplicate names within one source", () => {
		expect(
			proposeMigrationIdentity(
				{ source: "registration", sourceId: "r1", name: "Sam Lee" },
				[
					{ source: "base44", sourceId: "b1", name: "Sam Lee" },
					{ source: "base44", sourceId: "b2", name: "Sam Lee" },
				],
			).status,
		).toBe("review");
	});
	test("prefers an explicit source ID over a matching name", () => {
		const proposal = proposeMigrationIdentity(
			{ source: "base44", sourceId: "b1", name: "Sam Lee", sporteasyId: "42" },
			[
				{
					source: "legacy",
					sourceId: "l1",
					name: "Samuel Lee",
					sporteasyId: "42",
				},
				{
					source: "legacy",
					sourceId: "l2",
					name: "Sam Lee",
					sporteasyId: "43",
				},
			],
		);
		expect(proposal.method).toBe("source-id");
		expect(proposal.candidates.map((person) => person.sourceId)).toEqual([
			"l1",
		]);
	});
});
