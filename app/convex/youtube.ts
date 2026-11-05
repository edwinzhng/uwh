import { v } from "convex/values";
import { canManageResources } from "../src/domain/resources";
import { validateYoutubeUpload } from "../src/domain/youtube-upload";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";
import { youtubeOAuthClient } from "./youtube_config";

export const youtubeActor = async (
	ctx: QueryCtx,
): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!canManageResources(actor))
		throw new Error("Coach or admin access required.");
	return actor;
};
export const normalizeUploadId = internalQuery({
	args: { id: v.string() },
	handler: async (ctx, { id }): Promise<Id<"youtubeUploads">> => {
		const normalized = ctx.db.normalizeId("youtubeUploads", id);
		if (!normalized) throw new Error("Upload unavailable.");
		return normalized;
	},
});
export const status = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{ configured: boolean; channelName?: string }> => {
		const actor = await youtubeActor(ctx);
		const connection = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.unique();
		return {
			configured: Boolean(youtubeOAuthClient()),
			channelName: connection?.channelName,
		};
	},
});
export const authorize = internalMutation({
	args: { state: v.string() },
	handler: async (ctx, { state }): Promise<string> => {
		const actor = await youtubeActor(ctx);
		if (!actor.admin)
			throw new Error("An administrator must connect the club channel.");
		const client = youtubeOAuthClient();
		const site = process.env.CONVEX_SITE_URL;
		if (!client || !site)
			throw new Error("YouTube uploads need administrator setup first.");
		for (const row of await ctx.db
			.query("youtubeAuthorizations")
			.withIndex("by_user", (q) => q.eq("userId", actor.userId))
			.collect())
			await ctx.db.delete(row._id);
		await ctx.db.insert("youtubeAuthorizations", {
			clubId: actor.clubId,
			userId: actor.userId,
			state,
			expiresAt: Date.now() + 600000,
		});
		const params = new URLSearchParams({
			client_id: client.clientId,
			redirect_uri: `${site}/youtube/callback`,
			response_type: "code",
			scope: "https://www.googleapis.com/auth/youtube.force-ssl",
			access_type: "offline",
			prompt: "consent",
			state,
		});
		return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
	},
});
export const consumeAuthorization = internalMutation({
	args: { state: v.string() },
	handler: async (
		ctx,
		{ state },
	): Promise<{ clubId: Id<"clubs">; userId: Id<"users"> }> => {
		const row = await ctx.db
			.query("youtubeAuthorizations")
			.withIndex("by_state", (q) => q.eq("state", state))
			.unique();
		if (!row || row.expiresAt < Date.now())
			throw new Error(
				"This connection link expired. Connect YouTube again from the app.",
			);
		const member = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", row.userId))
			.first();
		if (!member?.admin || member.clubId !== row.clubId)
			throw new Error("Administrator access is no longer available.");
		await ctx.db.delete(row._id);
		return { clubId: row.clubId, userId: row.userId };
	},
});
export const connect = internalMutation({
	args: {
		clubId: v.id("clubs"),
		userId: v.id("users"),
		channelId: v.string(),
		channelName: v.string(),
		refreshToken: v.string(),
	},
	handler: async (ctx, { userId, ...value }): Promise<void> => {
		const member = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!member?.admin || member.clubId !== value.clubId)
			throw new Error("Administrator access is no longer available.");
		const previous = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", value.clubId))
			.unique();
		if (previous && previous.channelId !== value.channelId)
			throw new Error(
				"Reconnect the same club channel to preserve uploaded videos.",
			);
		if (previous) await ctx.db.patch(previous._id, value);
		else await ctx.db.insert("youtubeConnections", value);
	},
});
export const reserve = mutation({
	args: {
		key: v.string(),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
	},
	handler: async (ctx, args): Promise<Id<"youtubeUploads">> => {
		const actor = await youtubeActor(ctx);
		const error = validateYoutubeUpload(args.size, args.mime);
		if (error) throw new Error(error);
		if (
			!args.key ||
			args.key.length > 100 ||
			!args.name ||
			args.name.length > 200
		)
			throw new Error("Choose that video again.");
		const connection = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.unique();
		if (!connection)
			throw new Error(
				"Ask an administrator to connect the club's YouTube channel.",
			);
		const previous = await ctx.db
			.query("youtubeUploads")
			.withIndex("by_owner_key", (q) =>
				q.eq("ownerId", actor.userId).eq("key", args.key),
			)
			.unique();
		if (previous) {
			if (
				previous.clubId !== actor.clubId ||
				previous.name !== args.name ||
				previous.size !== args.size ||
				previous.mime !== args.mime ||
				previous.expiresAt < Date.now()
			)
				throw new Error(
					"This upload changed or expired. Choose the video again.",
				);
			return previous._id;
		}
		const pending = await ctx.db
			.query("youtubeUploads")
			.withIndex("by_owner_key", (q) => q.eq("ownerId", actor.userId))
			.filter((q) => q.eq(q.field("resourceId"), undefined))
			.take(10);
		if (pending.length >= 10)
			throw new Error("Finish saving pending videos before uploading more.");
		const id = await ctx.db.insert("youtubeUploads", {
			...args,
			clubId: actor.clubId,
			ownerId: actor.userId,
			expiresAt: Date.now() + 86400000,
		});
		await ctx.scheduler.runAfter(
			86400000,
			internal.youtube_actions.expireUpload,
			{ id },
		);
		return id;
	},
});
export const uploadContext = internalQuery({
	args: { id: v.id("youtubeUploads") },
	handler: async (
		ctx,
		{ id },
	): Promise<{
		upload: Doc<"youtubeUploads">;
		connection: Doc<"youtubeConnections">;
	}> => {
		const actor = await youtubeActor(ctx);
		const upload = await ctx.db.get(id);
		if (
			!upload ||
			upload.ownerId !== actor.userId ||
			upload.clubId !== actor.clubId ||
			upload.resourceId ||
			upload.expiresAt < Date.now()
		)
			throw new Error("This upload is unavailable. Choose the video again.");
		const connection = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.unique();
		if (!connection) throw new Error("Reconnect the club's YouTube channel.");
		return { upload, connection };
	},
});
export const updateUpload = internalMutation({
	args: {
		id: v.id("youtubeUploads"),
		sessionUrl: v.optional(v.string()),
		videoId: v.optional(v.string()),
	},
	handler: async (ctx, { id, ...value }): Promise<void> => {
		const actor = await youtubeActor(ctx);
		const upload = await ctx.db.get(id);
		if (
			!upload ||
			upload.ownerId !== actor.userId ||
			upload.clubId !== actor.clubId ||
			upload.resourceId ||
			upload.expiresAt < Date.now()
		)
			throw new Error("Upload unavailable.");
		await ctx.db.patch(id, value);
	},
});
export const cleanupContext = internalQuery({
	args: { id: v.id("youtubeUploads") },
	handler: async (
		ctx,
		{ id },
	): Promise<{
		upload: Doc<"youtubeUploads">;
		connection: Doc<"youtubeConnections">;
	} | null> => {
		const upload = await ctx.db.get(id);
		if (!upload || upload.resourceId || upload.expiresAt > Date.now())
			return null;
		const connection = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", upload.clubId))
			.unique();
		return connection ? { upload, connection } : null;
	},
});
export const removeUpload = internalMutation({
	args: { id: v.id("youtubeUploads") },
	handler: async (ctx, { id }): Promise<void> => {
		const row = await ctx.db.get(id);
		if (row && !row.resourceId && row.expiresAt <= Date.now())
			await ctx.db.delete(id);
	},
});
