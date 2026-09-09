import { imageLimits, imageMime } from "../src/domain/messaging";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { actionUserId as getAuthUserId } from "./identity";

const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Authorization, Content-Type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
};
const failure = (message: string, status: number): Response =>
	Response.json({ error: message }, { status, headers });
export const preflight = httpAction(
	async (): Promise<Response> => new Response(null, { status: 204, headers }),
);

export const upload = httpAction(async (ctx, request): Promise<Response> => {
	const userId = await getAuthUserId(ctx);
	if (!userId) return failure("Sign in to add photos.", 401);
	const params = new URL(request.url).searchParams;
	const threadId = params.get("thread") ?? "";
	if (!(await ctx.runQuery(internal.images.canUpload, { userId, threadId })))
		return failure("Conversation unavailable.", 403);
	if (Number(request.headers.get("Content-Length")) > imageLimits.bytes)
		return failure("Choose a photo under 5 MB.", 413);
	const blob = await request.blob();
	if (!blob.size || blob.size > imageLimits.bytes)
		return failure("Choose a photo under 5 MB.", 413);
	const mime = imageMime(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
	if (!mime || mime !== blob.type)
		return failure("Choose a JPG, PNG or WebP photo.", 415);
	const name = (params.get("name") || "Photo").slice(0, 120);
	const storageId = await ctx.storage.store(blob);
	try {
		const id = await ctx.runMutation(internal.images.register, {
			userId,
			threadId,
			storageId,
			name,
			mime,
			size: blob.size,
		});
		return Response.json({ id, name }, { headers });
	} catch {
		await ctx.storage.delete(storageId);
		return failure(
			"Could not attach photo. Send or remove pending photos and try again.",
			409,
		);
	}
});

export const download = httpAction(async (ctx, request): Promise<Response> => {
	const userId = await getAuthUserId(ctx);
	if (!userId) return failure("Sign in to view photos.", 401);
	const imageId = new URL(request.url).searchParams.get("id") ?? "";
	const image = await ctx.runQuery(internal.images.readable, {
		userId,
		imageId,
	});
	if (!image) return failure("Photo unavailable.", 404);
	const blob = await ctx.storage.get(image.storageId);
	if (!blob) return failure("Photo unavailable.", 404);
	return new Response(blob, {
		headers: { ...headers, "Content-Type": image.mime },
	});
});
