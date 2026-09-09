import {
	type MessageAction,
	reduceMessages,
} from "../src/domain/message-reducer";
import {
	directThreadId,
	directThreadKey,
	isDirectThread,
} from "../src/domain/messaging";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { checkContent } from "./chat_policy";
import { accountFor } from "./identity";
import { messageFor, threadFor } from "./message_access";
import { blockedIds, canChat, eraseMessage, requireChat } from "./moderation";
import { enqueue } from "./notifications";

export const openDirectThread = async (
	ctx: MutationCtx,
	member: Doc<"memberships">,
	recipientId: string,
	proposedId?: string,
): Promise<string> => {
	if (!(await canChat(ctx, member.userId)))
		throw new Error("Your chat access is paused. Contact a club admin.");
	const recipient = ctx.db.normalizeId("users", recipientId);
	const target = recipient
		? await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", recipient))
				.first()
		: undefined;
	if (
		!target ||
		target.clubId !== member.clubId ||
		target.userId === member.userId
	)
		throw new Error("Choose another club account.");
	if ((await blockedIds(ctx, member.userId)).includes(recipientId))
		throw new Error("Messaging is unavailable between these accounts.");
	const key = directThreadKey(member.userId, recipientId);
	const existing = await ctx.db
		.query("conversations")
		.withIndex("by_direct", (q) =>
			q.eq("clubId", member.clubId).eq("directKey", key),
		)
		.unique();
	if (existing) return existing.value.id;
	const legacy = (
		await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.collect()
	).find((row) => isDirectThread(row.value, member.userId, recipientId));
	if (legacy) {
		await ctx.db.patch(legacy._id, { directKey: key });
		return legacy.value.id;
	}
	const id = proposedId ?? directThreadId(member.userId, recipientId);
	if (!id || id.length > 160 || (await threadFor(ctx, member.clubId, id)))
		throw new Error("Conversation unavailable.");
	await ctx.db.insert("conversations", {
		clubId: member.clubId,
		directKey: key,
		value: {
			id,
			title: target.name,
			subtitle: "Direct message",
			accountIds: [member.userId, recipientId],
		},
	});
	return id;
};

export const applyMessage = async (
	ctx: MutationCtx,
	member: Doc<"memberships">,
	action: MessageAction,
): Promise<string | null> => {
	if (action.type === "create-thread")
		return openDirectThread(ctx, member, action.recipientId, action.id);
	const message = await messageFor(
		ctx,
		member.clubId,
		action.type === "send-message" ? action.id : action.messageId,
	);
	const threadId =
		action.type === "send-message" ? action.threadId : message?.value.threadId;
	const thread = threadId
		? await threadFor(ctx, member.clubId, threadId)
		: undefined;
	if (!thread?.value.accountIds.includes(member.userId))
		throw new Error("Conversation unavailable.");
	const blocked = await blockedIds(ctx, member.userId);
	if (message && blocked.includes(message.value.accountId))
		throw new Error("Message unavailable.");
	if (action.type !== "delete-message")
		await requireChat(ctx, member, thread.value.id);
	if (action.type === "send-message" && message) {
		if (
			message.value.accountId !== member.userId ||
			message.value.threadId !== action.threadId
		)
			throw new Error("Message unavailable.");
		return null;
	}
	const reply =
		action.type === "send-message" && action.replyToId
			? await messageFor(ctx, member.clubId, action.replyToId)
			: undefined;
	if (reply && blocked.includes(reply.value.accountId))
		throw new Error("Message unavailable.");
	if (action.type === "send-message" || action.type === "edit-message")
		await checkContent(ctx, member, action.body);
	if (action.type === "send-message") {
		if (!action.id || action.id.length > 160)
			throw new Error("Message unavailable.");
		const recent = await ctx.db
			.query("messages")
			.withIndex("by_author", (q) =>
				q
					.eq("clubId", member.clubId)
					.eq("value.accountId", member.userId)
					.gt("_creationTime", Date.now() - 60000),
			)
			.take(30);
		if (recent.length >= 30)
			throw new Error("You’re sending too quickly. Try again shortly.");
	}
	const previous = {
		conversations: [thread.value],
		messages: [message?.value, reply?.value].filter(
			(entry) => entry !== undefined,
		),
	};
	const next = reduceMessages(previous, accountFor(member), action);
	if (action.type === "send-message") {
		for (const photo of action.images ?? []) {
			const id = ctx.db.normalizeId("images", photo.id);
			const image = id ? await ctx.db.get(id) : undefined;
			if (
				!image ||
				image.ownerId !== member.userId ||
				image.clubId !== member.clubId ||
				image.threadId !== action.threadId ||
				image.messageId ||
				image.name !== photo.name
			)
				throw new Error("Attach this photo again.");
			await ctx.db.patch(image._id, { messageId: action.id });
		}
		const value = next.messages.find((entry) => entry.id === action.id);
		if (!value) throw new Error("Message unavailable.");
		await ctx.db.insert("messages", { clubId: member.clubId, value });
		await enqueue(ctx, {
			clubId: member.clubId,
			actorId: member.userId,
			kind: "messages",
			entityId: value.id,
			key: `${member.clubId}:message:${value.id}`,
		});
	} else if (message) {
		if (action.type === "delete-message") await eraseMessage(ctx, message);
		else {
			const value = next.messages.find(
				(entry) => entry.id === message.value.id,
			);
			if (value) await ctx.db.patch(message._id, { value });
		}
	}
	return null;
};
