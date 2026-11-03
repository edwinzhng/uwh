import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const recordWebPush = async (
	ctx: MutationCtx,
	job: Doc<"pushJobs">,
	member: Doc<"memberships">,
): Promise<void> => {
	const subscriptions = await ctx.db
		.query("webPushSubscriptions")
		.withIndex("by_user", (q) => q.eq("userId", member.userId))
		.collect();
	for (const subscription of subscriptions.filter(
		(row) => row.clubId === member.clubId,
	)) {
		if (
			await ctx.db
				.query("webPushDeliveries")
				.withIndex("by_job_subscription", (q) =>
					q.eq("jobId", job._id).eq("subscriptionId", subscription._id),
				)
				.unique()
		)
			continue;
		const id = await ctx.db.insert("webPushDeliveries", {
			clubId: member.clubId,
			userId: member.userId,
			jobId: job._id,
			subscriptionId: subscription._id,
			state: "pending",
			attempt: 0,
			updatedAt: Date.now(),
		});
		await ctx.scheduler.runAfter(0, internal.web_push_transport.send, { id });
	}
};
