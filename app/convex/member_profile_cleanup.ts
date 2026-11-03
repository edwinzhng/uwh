import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseMemberProfiles = async (
	ctx: MutationCtx,
	input: {
		clubId: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: string[];
	},
): Promise<void> => {
	const personIds = new Set(input.personIds ?? []);
	const [profiles, photos] = await Promise.all([
		ctx.db
			.query("memberProfiles")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.collect(),
		ctx.db
			.query("memberProfilePhotos")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.collect(),
	]);
	for (const profile of profiles) {
		if (input.removeClub || personIds.has(profile.personId))
			await ctx.db.delete(profile._id);
		else if (profile.lastActorId === input.userId)
			await ctx.db.patch(profile._id, { lastActorId: undefined });
	}
	for (const photo of photos) {
		if (
			input.removeClub ||
			personIds.has(photo.personId) ||
			(!photo.attached && photo.ownerId === input.userId)
		) {
			await ctx.storage.delete(photo.storageId);
			await ctx.db.delete(photo._id);
		} else if (photo.ownerId === input.userId)
			await ctx.db.patch(photo._id, { ownerId: undefined });
	}
};
