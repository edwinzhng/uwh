import { getAuthSessionId } from "@convex-dev/auth/server";
import { resourceDocumentMimes } from "../src/domain/resource-documents";
import {
	type ResourceFilePurpose,
	resourceByteRange,
} from "../src/domain/resources";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { actionUserId } from "./identity";
import { issuePlayback, verifyPlayback } from "./resource_playback";
import { resourceUploadStream } from "./resource_stream";
import { finishResourceUpload } from "./resource_upload";

const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"Authorization, Content-Type, If-None-Match, Range",
	"Access-Control-Expose-Headers":
		"Accept-Ranges, Content-Length, Content-Range, Content-Type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Cache-Control": "private, no-store",
	"X-Content-Type-Options": "nosniff",
};
const failure = (error: string, status: number): Response =>
	Response.json({ error }, { status, headers });
export const preflight = httpAction(
	async (): Promise<Response> => new Response(null, { status: 204, headers }),
);
export const upload = httpAction(async (ctx, request): Promise<Response> => {
	const userId = await actionUserId(ctx);
	if (!userId) return failure("Sign in to upload documents.", 401);
	if (!(await ctx.runQuery(internal.resources.canUpload, { userId })))
		return failure("Coach or admin access required.", 403);
	const requested =
		new URL(request.url).searchParams.get("purpose") ?? "document";
	const purpose: ResourceFilePurpose | undefined =
		requested === "document" ||
		requested === "video" ||
		requested === "thumbnail" ||
		requested === "voice"
			? requested
			: undefined;
	if (!purpose) return failure("Choose a supported media type.", 400);
	const stream = await resourceUploadStream(request, purpose);
	if (!stream.ok) return failure(stream.error, stream.status);
	const name = (new URL(request.url).searchParams.get("name") ?? "Document")
		.replace(/[^\p{L}\p{N}._ -]/gu, "-")
		.slice(0, 120);
	try {
		const url = await ctx.runMutation(internal.resources.uploadUrl, { userId });
		const options: RequestInit & { duplex: "half" } = {
			method: "POST",
			body: stream.body,
			headers: { "Content-Type": stream.mime },
			duplex: "half",
		};
		const uploaded = await fetch(url, options);
		if (!uploaded.ok)
			return failure("Could not store this media file. Try again.", 502);
		const payload: { storageId: Id<"_storage"> } = await uploaded.json();
		const upload = {
			userId,
			storageId: payload.storageId,
			name,
			mime: stream.mime,
			size: stream.state.bytes,
			purpose,
		};
		const file = await finishResourceUpload(
			() =>
				purpose === "document" && resourceDocumentMimes.includes(upload.mime)
					? ctx.runAction(internal.resource_ingest.ingest, upload)
					: ctx.runMutation(internal.resources.registerFile, upload),
			() => ctx.storage.delete(upload.storageId),
		);
		return Response.json(file, { headers });
	} catch {
		if (stream.state.exceeded)
			return failure("This media file is too large.", 413);
		return failure(
			"Could not attach document. Finish saving pending uploads and try again.",
			409,
		);
	}
});
export const download = httpAction(async (ctx, request): Promise<Response> => {
	const params = new URL(request.url).searchParams;
	const resourceId = params.get("id") ?? "";
	const token = params.get("ticket");
	const playback = token ? await verifyPlayback(token, resourceId) : undefined;
	const userId = token ? undefined : ((await actionUserId(ctx)) ?? undefined);
	if (!userId && !playback)
		return failure("Sign in to open this document.", 401);
	const requestedSlot = params.get("slot") ?? "primary";
	if (
		requestedSlot !== "primary" &&
		requestedSlot !== "thumbnail" &&
		requestedSlot !== "voice"
	)
		return failure("Media unavailable.", 404);
	const planImage = params.get("planImage");
	if (playback && (planImage || requestedSlot !== "primary"))
		return failure("Media unavailable.", 404);
	const file =
		planImage && userId
			? await ctx.runQuery(internal.resources.readablePlanImage, {
					userId,
					fileId: planImage,
				})
			: await ctx.runQuery(internal.resources.readableFile, {
					userId,
					resourceId,
					slot: requestedSlot,
					playbackSession: playback?.sessionId,
				});
	if (!file || (playback && playback.fileId !== file._id))
		return failure("Document unavailable.", 404);
	if (params.get("playback") === "1") {
		const sessionId = userId ? await getAuthSessionId(ctx) : undefined;
		if (
			!sessionId ||
			planImage ||
			requestedSlot !== "primary" ||
			file.purpose !== "video"
		)
			return failure("Video unavailable.", 404);
		return Response.json(
			{ ticket: await issuePlayback(sessionId, resourceId, file._id) },
			{ headers },
		);
	}
	const thumbnailHeaders =
		requestedSlot === "thumbnail"
			? {
					"Cache-Control": "private, no-cache",
					ETag: `"${file._id}"`,
					Vary: "Authorization",
				}
			: undefined;
	if (
		thumbnailHeaders &&
		request.headers.get("If-None-Match") === thumbnailHeaders.ETag
	)
		return new Response(null, {
			status: 304,
			headers: { ...headers, ...thumbnailHeaders },
		});
	const range = ((): ReturnType<typeof resourceByteRange> | false => {
		try {
			const requested = resourceByteRange(
				request.headers.get("Range"),
				file.size,
			);
			if (!playback || file.size <= 100 * 1024 * 1024) return requested;
			const start = requested?.start ?? 0;
			return {
				start,
				end: Math.min(
					requested?.end ?? file.size - 1,
					start + 32 * 1024 * 1024 - 1,
				),
			};
		} catch {
			return false;
		}
	})();
	if (range === false)
		return new Response(null, {
			status: 416,
			headers: { ...headers, "Content-Range": `bytes */${file.size}` },
		});
	const url = await ctx.storage.getUrl(file.storageId);
	if (!url) return failure("Media unavailable.", 404);
	const upstream = await fetch(url, {
		headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {},
		signal: request.signal,
	});
	const contentRange = range
		? `bytes ${range.start}-${range.end}/${file.size}`
		: undefined;
	if (
		!upstream.ok ||
		(range &&
			(upstream.status !== 206 ||
				upstream.headers.get("Content-Range") !== contentRange))
	) {
		await upstream.body?.cancel();
		return failure("Media unavailable. Try again.", 502);
	}
	return new Response(upstream.body, {
		status: range ? 206 : 200,
		headers: {
			...headers,
			...thumbnailHeaders,
			"Content-Type": file.mime,
			"Content-Disposition": `${file.mime.startsWith("video/") || file.mime.startsWith("audio/") || requestedSlot === "thumbnail" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
			"Accept-Ranges": "bytes",
			"Content-Length": String(range ? range.end - range.start + 1 : file.size),
			...(contentRange ? { "Content-Range": contentRange } : {}),
		},
	});
});
