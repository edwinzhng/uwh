import { expect, test } from "bun:test";
import { needsImportedResourceLink } from "../convex/local_migration_media";

const resource = { _id: "resource", clubId: "owner-club" };

test("an imported pending file needs its resource ownership link", (): void => {
	expect(needsImportedResourceLink(resource, { clubId: "owner-club" })).toBe(
		true,
	);
});

test("repeating media reconciliation leaves correctly bound files unchanged", (): void => {
	expect(
		needsImportedResourceLink(resource, {
			clubId: "owner-club",
			resourceId: "resource",
		}),
	).toBe(false);
});

test("media repair refuses missing, cross-club and already-owned files", (): void => {
	for (const file of [
		null,
		{ clubId: "demo-club" },
		{ clubId: "owner-club", resourceId: "another-resource" },
	])
		expect(() => needsImportedResourceLink(resource, file)).toThrow(
			"Imported media ownership needs review.",
		);
});
