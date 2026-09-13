import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Message } from "../src/domain/app-types";
import type {
	ConversationSummary,
	ThreadMessage,
} from "../src/domain/messaging";
import { sessionThreadId } from "../src/domain/session-discussion";
import { mutation, query } from "./_generated/server";
import { memberFor, requireMember } from "./identity";
import { messageFor, threadFor, visibleMessage } from "./message_access";
import { openDirectThread } from "./message_commands";
import { blockedIds, canChat } from "./moderation";
import { resolveSessionThread, sessionAccounts } from "./session_discussion";

export const inbox = query({
	args: {},
	handler: async (ctx): Promise<ConversationSummary[]> => {
		const member = await memberFor(ctx);
		if (!member) return [];
		const [threads, reads, blocked, members] = await Promise.all([
			ctx.db
				.query("conversations")
				.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
				.collect(),
			ctx.db
				.query("conversationReads")
				.withIndex("by_user", (q) => q.eq("userId", member.userId))
				.collect(),
			blockedIds(ctx, member.userId),
			ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
				.collect(),
		]);
		const resolvedThreads = await Promise.all(
			threads.map((thread) => resolveSessionThread(ctx, thread)),
		);
		const results = await Promise.all(
			resolvedThreads
				.filter((row) => row.value.accountIds.includes(member.userId))
				.map(async (thread): Promise<ConversationSummary> => {
					const through =
						reads.find((read) => read.threadId === thread.value.id)?.through ??
						member._creationTime;
					const [latest, unread] = await Promise.all([
						ctx.db
							.query("messages")
							.withIndex("by_thread", (q) =>
								q
									.eq("clubId", member.clubId)
									.eq("value.threadId", thread.value.id),
							)
							.filter((q) =>
								q.and(
									...blocked.map((id) => q.neq(q.field("value.accountId"), id)),
								),
							)
							.order("desc")
							.first(),
						ctx.db
							.query("messages")
							.withIndex("by_thread", (q) =>
								q
									.eq("clubId", member.clubId)
									.eq("value.threadId", thread.value.id)
									.gt("_creationTime", through),
							)
							.filter((q) =>
								q.and(
									q.neq(q.field("value.deleted"), true),
									q.neq(q.field("value.accountId"), member.userId),
									...blocked.map((id) => q.neq(q.field("value.accountId"), id)),
								),
							)
							.take(100),
					]);
					const direct =
						!thread.value.eventId &&
						!thread.value.id.startsWith("session:") &&
						thread.value.id !== "club" &&
						thread.value.id !== "youth" &&
						thread.value.accountIds.length === 2;
					const other = direct
						? members.find(
								(entry) =>
									entry.userId !== member.userId &&
									thread.value.accountIds.includes(entry.userId),
							)
						: undefined;
					return {
						...thread.value,
						title: other?.name ?? thread.value.title,
						latest: latest ? visibleMessage(latest.value, blocked) : undefined,
						updatedAt: latest?._creationTime ?? thread._creationTime,
						unread: unread.length,
						readThrough: through,
					};
				}),
		);
		return results.toSorted(
			(a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
		);
	},
});

export const list = query({
	args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ threadId, paginationOpts },
	): Promise<PaginationResult<ThreadMessage>> => {
		const member = await memberFor(ctx);
		const thread = member
			? await threadFor(ctx, member.clubId, threadId)
			: undefined;
		if (!member || !thread?.value.accountIds.includes(member.userId))
			return { page: [], isDone: true, continueCursor: "" };
		const blocked = await blockedIds(ctx, member.userId);
		const result = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) =>
				q.eq("clubId", member.clubId).eq("value.threadId", threadId),
			)
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(100, paginationOpts.numItems),
				maximumRowsRead: 200,
			});
		return {
			...result,
			page: await Promise.all(
				result.page
					.filter((row) => !blocked.includes(row.value.accountId))
					.map(async (row): Promise<ThreadMessage> => {
						const reply = row.value.replyToId
							? await messageFor(ctx, member.clubId, row.value.replyToId)
							: undefined;
						return {
							...visibleMessage(row.value, blocked),
							createdAt: row._creationTime,
							reply:
								reply &&
								reply.value.threadId === threadId &&
								!blocked.includes(reply.value.accountId)
									? visibleMessage(reply.value, blocked)
									: undefined,
						};
					}),
			),
		};
	},
});

export const message = query({
	args: { messageId: v.string() },
	handler: async (ctx, { messageId }): Promise<Message | null> => {
		const member = await memberFor(ctx);
		if (!member) return null;
		const row = await messageFor(ctx, member.clubId, messageId);
		const thread = row
			? await threadFor(ctx, member.clubId, row.value.threadId)
			: undefined;
		const blocked = await blockedIds(ctx, member.userId);
		return row &&
			thread?.value.accountIds.includes(member.userId) &&
			!blocked.includes(row.value.accountId)
			? visibleMessage(row.value, blocked)
			: null;
	},
});

export const openDirect = mutation({
	args: { recipientId: v.string() },
	handler: async (ctx, { recipientId }): Promise<string> =>
		openDirectThread(ctx, await requireMember(ctx), recipientId),
});

export const markRead = mutation({
	args: { threadId: v.string(), messageId: v.string() },
	handler: async (ctx, { threadId, messageId }): Promise<void> => {
		const member = await requireMember(ctx);
		const thread = await threadFor(ctx, member.clubId, threadId);
		const message = await messageFor(ctx, member.clubId, messageId);
		if (
			!thread?.value.accountIds.includes(member.userId) ||
			message?.value.threadId !== threadId ||
			(await blockedIds(ctx, member.userId)).includes(message.value.accountId)
		)
			throw new Error("Message unavailable.");
		const previous = await ctx.db
			.query("conversationReads")
			.withIndex("by_user_thread", (q) =>
				q.eq("userId", member.userId).eq("threadId", threadId),
			)
			.unique();
		const through = Math.max(member._creationTime, message._creationTime);
		if (previous && previous.through >= through) return;
		if (previous) await ctx.db.patch(previous._id, { through });
		else
			await ctx.db.insert("conversationReads", {
				clubId: member.clubId,
				userId: member.userId,
				threadId,
				through,
			});
	},
});

export const openSession = mutation({
	args: { eventId: v.string() },
	handler: async (ctx, { eventId }): Promise<string> => {
		const member = await requireMember(ctx);
		if (!(await canChat(ctx, member.userId)))
			throw new Error("Your chat access is paused. Contact a club admin.");
		const accountIds = await sessionAccounts(ctx, member.clubId, eventId);
		if (!accountIds.includes(member.userId))
			throw new Error("Session discussion unavailable.");
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", member.clubId).eq("value.id", eventId),
			)
			.unique();
		if (!event) throw new Error("Session unavailable.");
		const id = sessionThreadId(eventId);
		const thread = await threadFor(ctx, member.clubId, id);
		const value = {
			id,
			eventId,
			title: event.value.title,
			subtitle: `${event.value.date} · Session discussion`,
			accountIds,
		};
		if (thread) {
			if (thread.value.eventId !== eventId)
				throw new Error("Conversation unavailable.");
			await ctx.db.patch(thread._id, { value });
		} else
			await ctx.db.insert("conversations", { clubId: member.clubId, value });
		return id;
	},
});
