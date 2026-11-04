import { resourceFileIds } from "../src/domain/resources";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { eraseYoutube, releaseYoutubeResource } from "./youtube_cleanup";

export const eraseResources = async (
	ctx: MutationCtx,
	{
		userId,
		clubId,
		removeClub,
		personIds = [],
	}: {
		userId: Id<"users">;
		clubId: Id<"clubs">;
		removeClub: boolean;
		personIds?: string[];
	},
): Promise<void> => {
	await eraseYoutube(ctx, { userId, clubId, removeClub });
	if (removeClub) {
		for (const file of await ctx.db
			.query("resourceFiles")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect()) {
			await ctx.storage.delete(file.storageId);
			await ctx.db.delete(file._id);
		}
		for (const table of ["resourceComments", "resources"] as const)
			for (const row of await ctx.db
				.query(table)
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect())
				await ctx.db.delete(row._id);
		return;
	}
	for (const comment of await ctx.db
		.query("resourceComments")
		.withIndex("by_author", (q) => q.eq("authorId", userId))
		.collect())
		await ctx.db.delete(comment._id);
	for (const file of await ctx.db
		.query("resourceFiles")
		.withIndex("by_owner", (q) => q.eq("ownerId", userId))
		.collect()) {
		if (file.resourceId || file.sessionPlanKey)
			await ctx.db.patch(file._id, { ownerId: undefined });
		else {
			await ctx.storage.delete(file.storageId);
			await ctx.db.delete(file._id);
		}
	}
	for (const resource of await ctx.db
		.query("resources")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect()) {
		const remaining = resource.personIds.filter(
			(id) => !personIds.includes(id),
		);
		if (
			resource.audience === "players" &&
			resource.personIds.length &&
			!remaining.length
		) {
			for (const fileId of resourceFileIds(resource)) {
				const id = ctx.db.normalizeId("resourceFiles", fileId);
				const file = id ? await ctx.db.get(id) : undefined;
				if (file) {
					await ctx.storage.delete(file.storageId);
					await ctx.db.delete(file._id);
				}
			}
			for (const comment of await ctx.db
				.query("resourceComments")
				.withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
				.collect())
				await ctx.db.delete(comment._id);
			await ctx.db.delete(resource._id);
			await releaseYoutubeResource(ctx, clubId, resource._id);
		} else if (
			resource.authorId === userId ||
			remaining.length !== resource.personIds.length
		) {
			await ctx.db.patch(resource._id, {
				personIds: remaining,
				authorId: resource.authorId === userId ? undefined : resource.authorId,
			});
		}
	}
};
