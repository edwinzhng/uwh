import { v } from "convex/values";
import { imageLimits } from "../src/domain/messaging";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { getAuthUserId } from "./identity";
import { blockedIds, chatAccessError, requireChat } from "./moderation";
import { threadMembership } from "./thread_access";

export const canUpload = internalQuery({
	args: { userId: v.id("users"), threadId: v.string() },
	handler: async (ctx, { userId, threadId }): Promise<boolean> => {
		const member = await threadMembership(ctx, userId, threadId);
		if (!member) return false;
		return !(await chatAccessError(ctx, member, threadId));
	},
});

export const register = internalMutation({
	args: {
		userId: v.id("users"),
		threadId: v.string(),
		storageId: v.id("_storage"),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
	},
	handler: async (ctx, { userId, ...image }): Promise<Id<"images">> => {
		const membership = await threadMembership(ctx, userId, image.threadId);
		if (!membership) throw new Error("Conversation unavailable.");
		await requireChat(ctx, membership, image.threadId);
		const pending = await ctx.db
			.query("images")
			.withIndex("by_owner_message", (q) =>
				q.eq("ownerId", userId).eq("messageId", undefined),
			)
			.take(imageLimits.pending);
		if (pending.length >= imageLimits.pending)
			throw new Error("Send or remove your pending photos first.");
		const id = await ctx.db.insert("images", {
			...image,
			clubId: membership.clubId,
			ownerId: userId,
		});
		await ctx.scheduler.runAfter(imageLimits.lifetime, internal.images.expire, {
			id,
		});
		return id;
	},
});

export const readable = internalQuery({
	args: { userId: v.id("users"), imageId: v.string() },
	handler: async (ctx, { userId, imageId }): Promise<Doc<"images"> | null> => {
		const id = ctx.db.normalizeId("images", imageId);
		const image = id ? await ctx.db.get(id) : undefined;
		if (!image || (!image.messageId && image.ownerId !== userId)) return null;
		const account = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (account?.admin && account.clubId === image.clubId && image.messageId) {
			const reports = await ctx.db
				.query("chatReports")
				.withIndex("by_message", (q) =>
					q.eq("clubId", image.clubId).eq("messageId", image.messageId ?? ""),
				)
				.collect();
			if (reports.some((report) => report.imageIds.includes(image._id)))
				return image;
		}
		if ((await blockedIds(ctx, userId)).includes(image.ownerId)) return null;
		const membership = await threadMembership(ctx, userId, image.threadId);
		return membership?.clubId === image.clubId ? image : null;
	},
});

export const remove = mutation({
	args: { imageId: v.string() },
	handler: async (ctx, { imageId }): Promise<null> => {
		const userId = await getAuthUserId(ctx);
		const id = ctx.db.normalizeId("images", imageId);
		const image = id ? await ctx.db.get(id) : undefined;
		if (!userId || (image && (image.ownerId !== userId || image.messageId)))
			throw new Error("Photo unavailable.");
		if (image) {
			await ctx.storage.delete(image.storageId);
			await ctx.db.delete(image._id);
		}
		return null;
	},
});

export const expire = internalMutation({
	args: { id: v.id("images") },
	handler: async (ctx, { id }): Promise<null> => {
		const image = await ctx.db.get(id);
		if (image && !image.messageId) {
			await ctx.storage.delete(image.storageId);
			await ctx.db.delete(id);
		}
		return null;
	},
});
