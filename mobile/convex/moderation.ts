import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { memberFor, requireMember } from "./identity";

export const blockedIds = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<string[]> => {
	const [outgoing, incoming] = await Promise.all([
		ctx.db
			.query("blocks")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect(),
		ctx.db
			.query("blocks")
			.withIndex("by_target", (q) => q.eq("targetId", userId))
			.collect(),
	]);
	return [
		...new Set([
			...outgoing.map((row) => row.targetId),
			...incoming.map((row) => row.userId),
		]),
	];
};
export const canChat = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<boolean> =>
	!(await ctx.db
		.query("chatRestrictions")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first());
export const chatAccessError = async (
	ctx: QueryCtx,
	membership: Doc<"memberships">,
	threadId: string,
): Promise<string | undefined> => {
	if (!(await canChat(ctx, membership.userId)))
		return "Your chat access is paused. Contact a club admin.";
	const thread = await ctx.db
		.query("conversations")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", membership.clubId).eq("value.id", threadId),
		)
		.unique();
	if (!thread?.value.accountIds.includes(membership.userId))
		return "Conversation unavailable.";
	const blocked = await blockedIds(ctx, membership.userId);
	if (
		thread.value.id !== "club" &&
		thread.value.id !== "youth" &&
		thread.value.accountIds.some((id) => blocked.includes(id))
	)
		return "Messaging is unavailable between these accounts.";
	return undefined;
};
export const requireChat = async (
	ctx: QueryCtx,
	membership: Doc<"memberships">,
	threadId: string,
): Promise<void> => {
	const error = await chatAccessError(ctx, membership, threadId);
	if (error) throw new Error(error);
};
export const eraseMessage = async (
	ctx: MutationCtx,
	message: Doc<"messages">,
): Promise<void> => {
	for (const photo of message.value.images ?? []) {
		const id = ctx.db.normalizeId("images", photo.id);
		const image = id ? await ctx.db.get(id) : undefined;
		if (
			image &&
			image.clubId === message.clubId &&
			image.messageId === message.value.id
		) {
			await ctx.storage.delete(image.storageId);
			await ctx.db.delete(image._id);
		}
	}
	await ctx.db.patch(message._id, {
		value: {
			...message.value,
			body: "",
			images: [],
			reactions: [],
			replyToId: undefined,
			deleted: true,
		},
	});
};
export const status = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{
		blocked: { id: Id<"users">; name: string }[];
		unavailableIds: string[];
		paused: boolean;
	}> => {
		const member = await memberFor(ctx);
		if (!member) return { blocked: [], unavailableIds: [], paused: true };
		const blocks = await ctx.db
			.query("blocks")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.collect();
		return {
			blocked: await Promise.all(
				blocks.map(async (row): Promise<{ id: Id<"users">; name: string }> => {
					const target = await ctx.db
						.query("memberships")
						.withIndex("by_user", (q) => q.eq("userId", row.targetId))
						.first();
					return {
						id: row.targetId,
						name:
							target?.clubId === member.clubId ? target.name : "Former member",
					};
				}),
			),
			unavailableIds: await blockedIds(ctx, member.userId),
			paused: !(await canChat(ctx, member.userId)),
		};
	},
});
export const block = mutation({
	args: { targetId: v.string(), blocked: v.boolean() },
	handler: async (ctx, { targetId, blocked }): Promise<void> => {
		const member = await requireMember(ctx);
		const target = ctx.db.normalizeId("users", targetId);
		if (!target || target === member.userId)
			throw new Error("Choose another account.");
		const rows = await ctx.db
			.query("blocks")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.collect();
		const existing = rows.find((row) => row.targetId === target);
		if (!blocked) {
			if (existing) await ctx.db.delete(existing._id);
			return;
		}
		const other = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", target))
			.first();
		if (other?.clubId !== member.clubId)
			throw new Error("Account unavailable.");
		if (!existing)
			await ctx.db.insert("blocks", {
				clubId: member.clubId,
				userId: member.userId,
				targetId: target,
			});
	},
});
export const report = mutation({
	args: { messageId: v.string(), reason: v.string(), blockAuthor: v.boolean() },
	handler: async (ctx, { messageId, reason, blockAuthor }): Promise<void> => {
		const member = await requireMember(ctx);
		if (!reason.trim() || reason.length > 1000)
			throw new Error("Add a reason under 1,000 characters.");
		const message = await ctx.db
			.query("messages")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", member.clubId).eq("value.id", messageId),
			)
			.unique();
		if (
			!message ||
			message.value.deleted ||
			message.value.accountId === member.userId
		)
			throw new Error("Message unavailable.");
		const thread = await ctx.db
			.query("conversations")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", member.clubId).eq("value.id", message.value.threadId),
			)
			.unique();
		if (
			!thread?.value.accountIds.includes(member.userId) ||
			(await blockedIds(ctx, member.userId)).includes(message.value.accountId)
		)
			throw new Error("Message unavailable.");
		const duplicate = await ctx.db
			.query("chatReports")
			.withIndex("by_reporter_message", (q) =>
				q.eq("reporterId", member.userId).eq("messageId", messageId),
			)
			.first();
		if (duplicate) return;
		const recent = await ctx.db
			.query("chatReports")
			.withIndex("by_reporter", (q) =>
				q
					.eq("reporterId", member.userId)
					.gt("_creationTime", Date.now() - 3600000),
			)
			.take(10);
		if (recent.length >= 10)
			throw new Error("Too many reports. Try again later.");
		const subjectId =
			ctx.db.normalizeId("users", message.value.accountId) ?? undefined;
		await ctx.db.insert("chatReports", {
			clubId: member.clubId,
			reporterId: member.userId,
			subjectId,
			messageId,
			threadId: thread.value.id,
			author: message.value.author,
			body: message.value.body,
			imageIds: (message.value.images ?? []).map((image) => image.id),
			reason: reason.trim(),
			state: "open",
		});
		if (blockAuthor && subjectId)
			await ctx.db.insert("blocks", {
				clubId: member.clubId,
				userId: member.userId,
				targetId: subjectId,
			});
	},
});
export const queue = query({
	args: { includeReports: v.optional(v.boolean()) },
	handler: async (
		ctx,
		{ includeReports },
	): Promise<{
		reports: Doc<"chatReports">[];
		restrictions: { id: Id<"users">; name: string }[];
	}> => {
		const member = await memberFor(ctx);
		if (!member?.admin) return { reports: [], restrictions: [] };
		const restrictions = await ctx.db
			.query("chatRestrictions")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.collect();
		const members = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.collect();
		return {
			reports:
				includeReports === false
					? []
					: (
							await Promise.all([
								ctx.db
									.query("chatReports")
									.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
									.filter((q) => q.eq(q.field("state"), "open"))
									.order("asc")
									.take(100),
								ctx.db
									.query("chatReports")
									.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
									.filter((q) => q.neq(q.field("state"), "open"))
									.order("desc")
									.take(50),
							])
						).flat(),
			restrictions: restrictions.map((row) => ({
				id: row.userId,
				name:
					members.find((entry) => entry.userId === row.userId)?.name ??
					"Former member",
			})),
		};
	},
});
export const review = mutation({
	args: {
		reportId: v.id("chatReports"),
		decision: v.union(v.literal("dismissed"), v.literal("removed")),
		pauseChat: v.boolean(),
	},
	handler: async (ctx, { reportId, decision, pauseChat }): Promise<void> => {
		const member = await requireMember(ctx);
		const report = await ctx.db.get(reportId);
		if (!member.admin || report?.clubId !== member.clubId)
			throw new Error("Report unavailable.");
		if (report.state !== "open") return;
		if (decision === "removed") {
			const message = await ctx.db
				.query("messages")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", member.clubId).eq("value.id", report.messageId),
				)
				.unique();
			if (message) await eraseMessage(ctx, message);
		}
		if (pauseChat && report.subjectId) {
			const subjectId = report.subjectId;
			const target = await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", subjectId))
				.first();
			if (
				target?.clubId === member.clubId &&
				!(await ctx.db
					.query("chatRestrictions")
					.withIndex("by_user", (q) => q.eq("userId", target.userId))
					.first())
			)
				await ctx.db.insert("chatRestrictions", {
					clubId: member.clubId,
					userId: target.userId,
					moderatorId: member.userId,
					createdAt: Date.now(),
				});
		}
		await ctx.db.patch(reportId, {
			state: decision,
			reviewedBy: member.userId,
			reviewedAt: Date.now(),
		});
	},
});
export const restore = mutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }): Promise<void> => {
		const member = await requireMember(ctx);
		if (!member.admin) throw new Error("Admin access required.");
		const rows = await ctx.db
			.query("chatRestrictions")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const row of rows.filter((entry) => entry.clubId === member.clubId))
			await ctx.db.delete(row._id);
	},
});

export const reportsPage = query({
	args: {
		view: v.union(v.literal("open"), v.literal("reviewed")),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ view, paginationOpts },
	): Promise<PaginationResult<Doc<"chatReports">>> => {
		const member = await memberFor(ctx);
		if (!member?.admin) return { page: [], isDone: true, continueCursor: "" };
		return ctx.db
			.query("chatReports")
			.withIndex("by_club_state", (q) =>
				view === "open"
					? q.eq("clubId", member.clubId).eq("state", "open")
					: q.eq("clubId", member.clubId),
			)
			.filter((q) =>
				view === "open" ? q.eq(1, 1) : q.neq(q.field("state"), "open"),
			)
			.order(view === "open" ? "asc" : "desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(30, paginationOpts.numItems),
				maximumRowsRead: 200,
			});
	},
});
