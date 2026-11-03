import { expect, test } from "bun:test";
import { previewResourceMemberMerge } from "../src/domain/resource-member-merge";

test("resource merge deduplicates public tags without changing resource or file identity", (): void => {
	const result = previewResourceMemberMerge(
		[
			{
				id: "resource",
				title: "Shared drill",
				audience: "club",
				personIds: ["source", "target", "other"],
			},
		],
		"source",
		"target",
	);
	expect(result.conflicts).toEqual([]);
	expect(result.updates).toEqual([
		{ id: "resource", personIds: ["target", "other"] },
	]);
	expect(result.counts).toEqual([{ label: "Tagged resources", count: 1 }]);
});

test("resource merge blocks new private household access and permits an already explicit audience", (): void => {
	const privateResource = {
		id: "private",
		title: "Private coach clip",
		audience: "players" as const,
		personIds: ["source"],
	};
	expect(
		previewResourceMemberMerge(
			[privateResource],
			"source",
			"target",
		).conflicts.at(0)?.reason,
	).toContain("grant the target");
	expect(
		previewResourceMemberMerge(
			[{ ...privateResource, personIds: ["source", "target"] }],
			"source",
			"target",
		).conflicts,
	).toEqual([]);
	expect(
		previewResourceMemberMerge(
			[{ ...privateResource, personIds: ["other"] }],
			"source",
			"target",
		).updates,
	).toEqual([]);
});
