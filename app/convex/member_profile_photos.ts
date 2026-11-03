import { ConvexError, v } from "convex/values";
import {
	canEditMemberProfile,
	memberProfileLimits,
} from "../src/domain/member-profile";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { getAuthUserId } from "./identity";
import { profilePerson, profileRecord } from "./member_profiles";
import { hasAcceptedTerms, requireAcceptedTerms } from "./terms_access";

export const canUpload = internalQuery({
	args: { userId: v.id("users"), personId: v.string() },
	handler: async (ctx, { userId, personId }): Promise<boolean> => {
		const actor = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!actor) return false;
		if (!(await hasAcceptedTerms(ctx, actor))) return false;
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", personId),
			)
			.unique();
		return Boolean(person && canEditMemberProfile(actor, person.value));
	},
});
export const register = internalMutation({
	args: {
		userId: v.id("users"),
		personId: v.string(),
		key: v.string(),
		digest: v.string(),
		storageId: v.id("_storage"),
		mime: v.string(),
		size: v.number(),
	},
	handler: async (
		ctx,
		{ userId, ...input },
	): Promise<{ id: Id<"memberProfilePhotos">; reused: boolean }> => {
		const actor = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!actor) throw new ConvexError("Sign in first.");
		await requireAcceptedTerms(ctx, actor);
		const person = await profilePerson(ctx, actor.clubId, input.personId);
		if (!canEditMemberProfile(actor, person.value))
			throw new ConvexError("You can only edit active household profiles.");
		const previous = await ctx.db
			.query("memberProfilePhotos")
			.withIndex("by_owner_key", (q) =>
				q.eq("ownerId", userId).eq("key", input.key),
			)
			.unique();
		if (previous) {
			if (
				previous.personId !== input.personId ||
				previous.clubId !== actor.clubId ||
				previous.digest !== input.digest
			)
				throw new ConvexError("This photo key was already used.");
			return { id: previous._id, reused: true };
		}
		const pending = await ctx.db
			.query("memberProfilePhotos")
			.withIndex("by_owner_attached", (q) =>
				q.eq("ownerId", userId).eq("attached", false),
			)
			.take(memberProfileLimits.pendingPhotos);
		if (pending.length >= memberProfileLimits.pendingPhotos)
			throw new ConvexError("Save or remove pending profile photos first.");
		const id = await ctx.db.insert("memberProfilePhotos", {
			...input,
			clubId: actor.clubId,
			ownerId: userId,
			attached: false,
		});
		await ctx.scheduler.runAfter(
			memberProfileLimits.photoLifetime,
			internal.member_profile_photos.expire,
			{ id },
		);
		return { id, reused: false };
	},
});
export const readable = internalQuery({
	args: { userId: v.id("users"), photoId: v.string() },
	handler: async (
		ctx,
		{ userId, photoId },
	): Promise<Doc<"memberProfilePhotos"> | null> => {
		const id = ctx.db.normalizeId("memberProfilePhotos", photoId);
		const photo = id ? await ctx.db.get(id) : undefined;
		if (!photo) return null;
		const actor = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!actor || actor.clubId !== photo.clubId) return null;
		if (!photo.attached) {
			const person = await profilePerson(ctx, actor.clubId, photo.personId);
			return photo.ownerId === userId &&
				canEditMemberProfile(actor, person.value)
				? photo
				: null;
		}
		const profile = await profileRecord(ctx, actor.clubId, photo.personId);
		return profile?.photoId === photo._id ? photo : null;
	},
});
export const remove = mutation({
	args: { photoId: v.string() },
	handler: async (ctx, { photoId }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in first.");
		const id = ctx.db.normalizeId("memberProfilePhotos", photoId);
		const photo = id ? await ctx.db.get(id) : undefined;
		if (!photo) return;
		if (photo.ownerId !== userId || photo.attached)
			throw new ConvexError("Save the profile to remove its current photo.");
		await ctx.storage.delete(photo.storageId);
		await ctx.db.delete(photo._id);
	},
});
export const expire = internalMutation({
	args: { id: v.id("memberProfilePhotos") },
	handler: async (ctx, { id }): Promise<void> => {
		const photo = await ctx.db.get(id);
		if (!photo || photo.attached) return;
		await ctx.storage.delete(photo.storageId);
		await ctx.db.delete(photo._id);
	},
});
