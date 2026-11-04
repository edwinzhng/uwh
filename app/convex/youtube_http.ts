import { resourceMediaMime } from "../src/domain/resources";
import {
	youtubeChunkSize,
	youtubeSessionUrl,
} from "../src/domain/youtube-upload";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { actionUserId } from "./identity";
import { boundedBlob } from "./request_body";
import {
	youtubeCredentials,
	youtubePosition,
	youtubeToken,
} from "./youtube_api";

const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"Authorization, Content-Type, X-Upload-Offset",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Cache-Control": "no-store",
	"Referrer-Policy": "no-referrer",
};
export const preflight = httpAction(
	async (): Promise<Response> => new Response(null, { status: 204, headers }),
);
export const callback = httpAction(async (ctx, request): Promise<Response> => {
	try {
		const url = new URL(request.url);
		const state = url.searchParams.get("state");
		if (!state || state.length > 100)
			throw new Error("Connection link unavailable.");
		const actor = await ctx.runMutation(internal.youtube.consumeAuthorization, {
			state,
		});
		const code = url.searchParams.get("code");
		if (!code || code.length > 4096 || url.searchParams.has("error"))
			throw new Error(
				"YouTube connection cancelled. Return to the app to try again.",
			);
		const { clientId, clientSecret, redirectUri } = youtubeCredentials();
		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
			}),
		});
		if (!response.ok)
			throw new Error(
				"YouTube authorization failed. Return to the app and connect again.",
			);
		const tokens: { refresh_token?: string; access_token?: string } =
			await response.json();
		if (!tokens.refresh_token || !tokens.access_token)
			throw new Error("Allow channel access when connecting YouTube.");
		const channels = await fetch(
			"https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
			{ headers: { Authorization: `Bearer ${tokens.access_token}` } },
		);
		if (!channels.ok) throw new Error("Could not read the club channel.");
		const data: { items?: { id: string; snippet: { title: string } }[] } =
			await channels.json();
		const channel = data.items?.at(0);
		if (!channel)
			throw new Error(
				"Create a YouTube channel for the club account, then connect again.",
			);
		await ctx.runMutation(internal.youtube.connect, {
			...actor,
			channelId: channel.id,
			channelName: channel.snippet.title,
			refreshToken: tokens.refresh_token,
		});
		return new Response(
			"YouTube connected. Return to the app to upload videos.",
			{ headers },
		);
	} catch {
		return new Response(
			"YouTube could not connect. Return to the app, check that you selected the club channel, and try connecting again.",
			{ status: 400, headers },
		);
	}
});
export const chunk = httpAction(async (ctx, request): Promise<Response> => {
	if (!(await actionUserId(ctx)))
		return Response.json(
			{ error: "Sign in before uploading videos." },
			{ status: 401, headers },
		);
	try {
		const rawId = new URL(request.url).searchParams.get("id");
		const id = await ctx.runQuery(internal.youtube.normalizeUploadId, {
			id: rawId ?? "",
		});
		const { upload, connection } = await ctx.runQuery(
			internal.youtube.uploadContext,
			{ id },
		);
		if (upload.videoId)
			return Response.json(
				{
					received: upload.size,
					url: `https://www.youtube.com/watch?v=${upload.videoId}`,
				},
				{ headers },
			);
		if (!upload.sessionUrl)
			throw new Error("Start this upload before sending video.");
		const offset = Number(request.headers.get("X-Upload-Offset"));
		if (
			!request.headers.has("X-Upload-Offset") ||
			!Number.isSafeInteger(offset) ||
			offset < 0 ||
			offset >= upload.size
		)
			throw new Error("Invalid video position. Retry to resume.");
		const body = await boundedBlob(request, youtubeChunkSize);
		if (
			!body?.size ||
			offset + body.size > upload.size ||
			(offset + body.size < upload.size && body.size % (256 * 1024) !== 0)
		)
			throw new Error("Invalid video chunk. Retry to resume.");
		if (
			offset === 0 &&
			resourceMediaMime(
				new Uint8Array(await body.slice(0, 64).arrayBuffer()),
				"video",
				upload.mime,
				upload.name,
			) !== upload.mime
		)
			throw new Error("Choose a supported video file.");
		const token = await youtubeToken(connection.refreshToken);
		const response = await fetch(youtubeSessionUrl(upload.sessionUrl), {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": upload.mime,
				"Content-Range": `bytes ${offset}-${offset + body.size - 1}/${upload.size}`,
			},
			body,
		});
		const result = await youtubePosition(response, upload.size);
		if (result.url)
			await ctx.runMutation(internal.youtube.updateUpload, {
				id,
				videoId: new URL(result.url).searchParams.get("v") ?? undefined,
			});
		return Response.json(result, { headers });
	} catch {
		return Response.json(
			{
				error:
					"Video upload interrupted. Check your connection and retry to resume. If it keeps failing, ask an administrator to reconnect YouTube.",
			},
			{ status: 400, headers },
		);
	}
});
