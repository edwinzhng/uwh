import { v } from "convex/values";
import { youtubeSessionUrl } from "../src/domain/youtube-upload";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import {
	deleteYoutubeVideo,
	type YoutubePosition,
	youtubeCompletedVideo,
	youtubePosition,
	youtubeToken,
} from "./youtube_api";

export const authorize = action({
	args: {},
	handler: async (ctx): Promise<string> =>
		ctx.runMutation(internal.youtube.authorize, { state: crypto.randomUUID() }),
});

export const position = action({
	args: { id: v.id("youtubeUploads") },
	handler: async (ctx, { id }): Promise<YoutubePosition> => {
		const { upload, connection } = await ctx.runQuery(
			internal.youtube.uploadContext,
			{ id },
		);
		if (upload.videoId)
			return {
				received: upload.size,
				url: `https://www.youtube.com/watch?v=${upload.videoId}`,
			};
		const token = await youtubeToken(connection.refreshToken);
		const sessionUrl =
			upload.sessionUrl ??
			(await (async (): Promise<string> => {
				const response = await fetch(
					"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							"X-Upload-Content-Length": String(upload.size),
							"X-Upload-Content-Type": upload.mime,
						},
						body: JSON.stringify({
							snippet: { title: "Club video", categoryId: "17" },
							status: {
								privacyStatus: "unlisted",
								embeddable: true,
							},
						}),
					},
				);
				const location = response.headers.get("Location");
				if (!response.ok || !location)
					throw new Error(
						"Could not start the YouTube upload. Check the channel connection and upload quota.",
					);
				const url = youtubeSessionUrl(location);
				await ctx.runMutation(internal.youtube.updateUpload, {
					id,
					sessionUrl: url,
				});
				return url;
			})());
		const response = await fetch(youtubeSessionUrl(sessionUrl), {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Range": `bytes */${upload.size}`,
				"Content-Length": "0",
			},
		});
		const result = await youtubePosition(response, upload.size);
		if (result.url)
			await ctx.runMutation(internal.youtube.updateUpload, {
				id,
				videoId: new URL(result.url).searchParams.get("v") ?? undefined,
			});
		return result;
	},
});
export const expireUpload = internalAction({
	args: { id: v.id("youtubeUploads"), attempt: v.optional(v.number()) },
	handler: async (ctx, { id, attempt = 0 }): Promise<void> => {
		const value = await ctx.runQuery(internal.youtube.cleanupContext, { id });
		if (!value) return;
		if (process.env.OUTBOUND_DELIVERY_DISABLED === "true") return;
		try {
			const token = await youtubeToken(value.connection.refreshToken);
			const videoId =
				value.upload.videoId ??
				(value.upload.sessionUrl
					? await youtubeCompletedVideo(
							token,
							youtubeSessionUrl(value.upload.sessionUrl),
							value.upload.size,
						)
					: undefined);
			if (videoId) await deleteYoutubeVideo(token, videoId);
			await ctx.runMutation(internal.youtube.removeUpload, { id });
		} catch (error) {
			if (attempt < 6)
				await ctx.scheduler.runAfter(
					3600000 * 2 ** attempt,
					internal.youtube_actions.expireUpload,
					{ id, attempt: attempt + 1 },
				);
			throw error;
		}
	},
});
export const deleteVideos = internalAction({
	args: {
		refreshToken: v.string(),
		videoIds: v.array(v.string()),
		sessions: v.optional(
			v.array(v.object({ url: v.string(), size: v.number() })),
		),
		attempt: v.optional(v.number()),
		revoke: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ refreshToken, videoIds, sessions, attempt = 0, revoke },
	): Promise<void> => {
		if (process.env.OUTBOUND_DELIVERY_DISABLED === "true") return;
		try {
			const token = await youtubeToken(refreshToken);
			for (const id of videoIds) await deleteYoutubeVideo(token, id);
			for (const session of sessions ?? []) {
				const id = await youtubeCompletedVideo(
					token,
					youtubeSessionUrl(session.url),
					session.size,
				);
				if (id) await deleteYoutubeVideo(token, id);
			}
			if (revoke)
				await fetch("https://oauth2.googleapis.com/revoke", {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({ token: refreshToken }),
				});
		} catch (error) {
			if (attempt < 6)
				await ctx.scheduler.runAfter(
					3600000 * 2 ** attempt,
					internal.youtube_actions.deleteVideos,
					{ refreshToken, videoIds, sessions, attempt: attempt + 1, revoke },
				);
			throw error;
		}
	},
});
