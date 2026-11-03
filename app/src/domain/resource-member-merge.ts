import type { MemberMergeConflict, MemberMergeCount } from "./member-merge";
import { replaceMergedPerson } from "./member-merge";
import type { ResourceAudience } from "./resources";

type MergeResource = {
	id: string;
	title: string;
	audience: ResourceAudience;
	personIds: string[];
};
export const previewResourceMemberMerge = (
	resources: MergeResource[],
	sourceId: string,
	targetId: string,
): {
	counts: MemberMergeCount[];
	conflicts: MemberMergeConflict[];
	updates: { id: string; personIds: string[] }[];
} => {
	const affected = resources.filter((resource) =>
		resource.personIds.includes(sourceId),
	);
	return {
		counts: [{ label: "Tagged resources", count: affected.length }],
		conflicts: affected
			.filter(
				(resource) =>
					resource.audience === "players" &&
					!resource.personIds.includes(targetId),
			)
			.map((resource) => ({
				category: "Private resource audience",
				record: resource.title,
				reason:
					"Relinking this tagged-player resource would grant the target player's household access to private source media.",
				resolution:
					"Review this resource's audience and explicitly retag it before merging, or keep the source profile as an archived alias.",
			})),
		updates: affected.map((resource) => ({
			id: resource.id,
			personIds: replaceMergedPerson(resource.personIds, sourceId, targetId),
		})),
	};
};
