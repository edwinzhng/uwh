import { youtubeVideoId } from "../src/domain/youtube-upload";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const releaseYoutubeResource = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	resourceId: Id<"resources">,
): Promise<void> => {
	for (const upload of await ctx.db
		.query("youtubeUploads")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.filter((q) => q.eq(q.field("resourceId"), resourceId))
		.collect()) {
		await ctx.db.patch(upload._id, {
			resourceId: undefined,
			expiresAt: Date.now(),
		});
		await ctx.scheduler.runAfter(0, internal.youtube_actions.expireUpload, {
			id: upload._id,
		});
	}
};
export const bindYoutubeResource = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	userId: Id<"users">,
	resourceId: Id<"resources">,
	url?: string,
	previousUrl?: string,
): Promise<void> => {
	if (
		youtubeVideoId(previousUrl) &&
		youtubeVideoId(previousUrl) !== youtubeVideoId(url)
	)
		await releaseYoutubeResource(ctx, clubId, resourceId);
	const videoId = youtubeVideoId(url);
	if (!videoId) return;
	const upload = await ctx.db
		.query("youtubeUploads")
		.withIndex("by_video", (q) => q.eq("videoId", videoId))
		.filter((q) => q.eq(q.field("clubId"), clubId))
		.first();
	if (!upload) return;
	if (upload.resourceId === resourceId) return;
	if (
		upload.resourceId ||
		upload.ownerId !== userId ||
		upload.expiresAt <= Date.now()
	)
		throw new Error("Upload that video again before saving.");
	await ctx.db.patch(upload._id, { resourceId });
};
export const eraseYoutube = async (
	ctx: MutationCtx,
	{
		userId,
		clubId,
		removeClub,
	}: { userId: Id<"users">; clubId: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	for (const row of await ctx.db
		.query("youtubeAuthorizations")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect())
		await ctx.db.delete(row._id);
	const uploads = await ctx.db
		.query("youtubeUploads")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect();
	if (removeClub) {
		const connection = await ctx.db
			.query("youtubeConnections")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.unique();
		if (connection) {
			await ctx.scheduler.runAfter(
				60000,
				internal.youtube_actions.deleteVideos,
				{
					refreshToken: connection.refreshToken,
					videoIds: uploads.flatMap((row) =>
						row.videoId ? [row.videoId] : [],
					),
					sessions: uploads.flatMap((row) =>
						!row.videoId && row.sessionUrl
							? [{ url: row.sessionUrl, size: row.size }]
							: [],
					),
					revoke: true,
				},
			);
			await ctx.db.delete(connection._id);
		}
		for (const row of uploads) await ctx.db.delete(row._id);
		return;
	}
	for (const row of uploads.filter((row) => row.ownerId === userId)) {
		await ctx.db.patch(row._id, {
			ownerId: undefined,
			...(!row.resourceId ? { expiresAt: Date.now() } : {}),
		});
		if (!row.resourceId)
			await ctx.scheduler.runAfter(
				60000,
				internal.youtube_actions.expireUpload,
				{ id: row._id },
			);
	}
};
