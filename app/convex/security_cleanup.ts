import { internalMutation } from "./_generated/server";

export const expire = internalMutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		for (const row of await ctx.db
			.query("accountConnections")
			.withIndex("by_expiration", (q) => q.lt("expiresAt", Date.now()))
			.take(100))
			await ctx.db.delete(row._id);
		const week = Date.now() - 7 * 86400000;
		const reports = await ctx.db
			.query("chatReports")
			.filter((q) => q.lt(q.field("_creationTime"), Date.now() - 90 * 86400000))
			.take(100);
		for (const report of reports) await ctx.db.delete(report._id);
		const jobs = await ctx.db
			.query("pushJobs")
			.filter((q) =>
				q.and(
					q.lt(q.field("createdAt"), week),
					q.or(
						q.eq(q.field("eventTimestamp"), undefined),
						q.lt(q.field("eventTimestamp"), week),
					),
				),
			)
			.take(100);
		for (const job of jobs) {
			for (const delivery of await ctx.db
				.query("pushDeliveries")
				.withIndex("by_job", (q) => q.eq("jobId", job._id))
				.collect())
				await ctx.db.delete(delivery._id);
			await ctx.db.delete(job._id);
		}
		for (const row of await ctx.db
			.query("mailLimits")
			.filter((q) => q.lt(q.field("sentAt"), Date.now() - 86400000))
			.take(100))
			await ctx.db.delete(row._id);
	},
});
