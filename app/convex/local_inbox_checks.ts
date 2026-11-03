import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

const requireFixture = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<void> => {
	const user = await ctx.db.get(userId);
	if (!user?.email?.startsWith("resources-inbox-"))
		throw new Error("Use the isolated inbox verification accounts.");
	requireLocalEmail(user.email);
	if (process.env.PUSH_DELIVERY_ENABLED === "true")
		throw new Error("Local notification transports required.");
};
export const seed = internalMutation({
	args: {
		userId: v.id("users"),
		sourceId: v.id("inboxItems"),
		count: v.number(),
		hidden: v.boolean(),
	},
	handler: async (ctx, { userId, sourceId, count, hidden }): Promise<void> => {
		await requireFixture(ctx, userId);
		const source = await ctx.db.get(sourceId);
		if (
			!source ||
			source.userId !== userId ||
			!Number.isInteger(count) ||
			count < 1 ||
			count > 130
		)
			throw new Error("Choose a bounded inbox fixture.");
		const { _id, _creationTime, ...value } = source;
		for (const index of Array.from({ length: count }, (_, index) => index))
			await ctx.db.insert("inboxItems", {
				...value,
				key: `${source.key}:fixture:${hidden}:${index}`,
				entityId: hidden ? `missing-${index}` : source.entityId,
				createdAt: Date.now() - index,
				readAt: undefined,
			});
	},
});
export const inspect = internalQuery({
	args: { userId: v.id("users") },
	handler: async (
		ctx,
		{ userId },
	): Promise<{ count: number; unread: number }> => {
		await requireFixture(ctx, userId);
		const rows = await ctx.db
			.query("inboxItems")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		return {
			count: rows.length,
			unread: rows.filter((row) => !row.readAt).length,
		};
	},
});
export const remaining = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }): Promise<number> => {
		requireLocalEmail("resources-inbox-cleanup@example.test");
		if (await ctx.db.get(userId))
			throw new Error(
				"Verify inbox cleanup only after the fictional account is erased.",
			);
		return (
			await ctx.db
				.query("inboxItems")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.collect()
		).length;
	},
});
