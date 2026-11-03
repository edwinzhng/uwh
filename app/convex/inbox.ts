import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { InboxItem, InboxTarget } from "../src/domain/inbox";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireMember } from "./identity";
import { notificationContent } from "./notification_access";

const ownedItem = async (
	ctx: QueryCtx,
	id: Id<"inboxItems">,
	member: Doc<"memberships">,
): Promise<Doc<"inboxItems">> => {
	const item = await ctx.db.get(id);
	if (!item || item.userId !== member.userId || item.clubId !== member.clubId)
		throw new Error("This notification is unavailable.");
	return item;
};

export const list = query({
	args: { paginationOpts: paginationOptsValidator, unreadOnly: v.boolean() },
	handler: async (
		ctx,
		{ paginationOpts, unreadOnly },
	): Promise<PaginationResult<InboxItem>> => {
		const member = await requireMember(ctx);
		const items = ctx.db.query("inboxItems");
		const page = await (unreadOnly
			? items.withIndex("by_user_club_read", (q) =>
					q
						.eq("userId", member.userId)
						.eq("clubId", member.clubId)
						.eq("readAt", undefined),
				)
			: items.withIndex("by_user_club", (q) =>
					q.eq("userId", member.userId).eq("clubId", member.clubId),
				)
		)
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.max(1, Math.min(40, paginationOpts.numItems)),
				maximumRowsRead: 100,
			});
		const visible = await Promise.all(
			page.page.map(async (item): Promise<InboxItem[]> => {
				const content = await notificationContent(ctx, item, member);
				return content
					? [
							{
								...content,
								id: item._id,
								createdAt: item.createdAt,
								readAt: item.readAt,
							},
						]
					: [];
			}),
		);
		return { ...page, page: visible.flat() };
	},
});
export const open = mutation({
	args: { id: v.id("inboxItems") },
	handler: async (ctx, { id }): Promise<InboxTarget> => {
		const member = await requireMember(ctx);
		const item = await ownedItem(ctx, id, member);
		const content = await notificationContent(ctx, item, member);
		if (!content)
			throw new Error("This notification is no longer available to you.");
		if (!item.readAt) await ctx.db.patch(id, { readAt: Date.now() });
		return content.target;
	},
});
export const setRead = mutation({
	args: { id: v.id("inboxItems"), read: v.boolean() },
	handler: async (ctx, { id, read }): Promise<void> => {
		const member = await requireMember(ctx);
		const item = await ownedItem(ctx, id, member);
		if (!(await notificationContent(ctx, item, member)))
			throw new Error("This notification is no longer available to you.");
		await ctx.db.patch(id, { readAt: read ? Date.now() : undefined });
	},
});
export const markAll = mutation({
	args: { through: v.number() },
	handler: async (ctx, { through }): Promise<{ done: boolean }> => {
		const member = await requireMember(ctx);
		if (!Number.isFinite(through) || through <= 0 || through > Date.now())
			throw new Error("Choose the current inbox timestamp.");
		const rows = await ctx.db
			.query("inboxItems")
			.withIndex("by_user_club_read", (q) =>
				q
					.eq("userId", member.userId)
					.eq("clubId", member.clubId)
					.eq("readAt", undefined)
					.lte("createdAt", through),
			)
			.take(101);
		for (const row of rows.slice(0, 100))
			await ctx.db.patch(row._id, { readAt: Date.now() });
		return { done: rows.length <= 100 };
	},
});
