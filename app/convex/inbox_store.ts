import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const recordInbox = async (
	ctx: MutationCtx,
	job: Doc<"pushJobs">,
	member: Doc<"memberships">,
): Promise<void> => {
	const previous = await ctx.db
		.query("inboxItems")
		.withIndex("by_user_key", (q) =>
			q.eq("userId", member.userId).eq("key", job.key),
		)
		.unique();
	if (previous) return;
	await ctx.db.insert("inboxItems", {
		clubId: job.clubId,
		userId: member.userId,
		key: job.key,
		kind: job.kind,
		topic: job.topic,
		relatedId: job.relatedId,
		partId: job.partId,
		sourceRevision: job.sourceRevision,
		staffOnly: job.staffOnly,
		entityId: job.entityId,
		actorId: job.actorId,
		eventPhase: job.eventPhase,
		eventTimestamp: job.eventTimestamp,
		eventIds: job.eventIds,
		createdAt: Date.now(),
	});
};
