import { sha256 } from "@oslojs/crypto/sha2";
import { memberProfileLimits } from "../src/domain/member-profile";
import { imageMime } from "../src/domain/messaging";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { actionUserId } from "./identity";
import { boundedBlob } from "./request_body";

const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Authorization, Content-Type",
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
	if (!userId) return failure("Sign in to add a profile photo.", 401);
	const params = new URL(request.url).searchParams;
	const personId = params.get("person") ?? "";
	const key = params.get("key") ?? "";
	if (key.length < 16 || key.length > 100)
		return failure("Reopen the photo editor and try again.", 400);
	if (
		!(await ctx.runQuery(internal.member_profile_photos.canUpload, {
			userId,
			personId,
		}))
	)
		return failure("You can only edit active household profiles.", 403);
	const blob = await boundedBlob(request, memberProfileLimits.photoBytes);
	if (!blob?.size) return failure("Choose a photo under 5 MB.", 413);
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const mime = imageMime(bytes.slice(0, 16));
	if (!mime || mime !== blob.type)
		return failure("Choose a JPG, PNG or WebP photo.", 415);
	const digest = Array.from(sha256(bytes), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	const storageId = await ctx.storage.store(blob);
	try {
		const photo = await ctx.runMutation(
			internal.member_profile_photos.register,
			{
				userId,
				personId,
				key,
				digest,
				storageId,
				mime,
				size: blob.size,
			},
		);
		if (photo.reused) await ctx.storage.delete(storageId);
		return Response.json({ id: photo.id }, { headers });
	} catch {
		await ctx.storage.delete(storageId);
		return failure(
			"Could not attach photo. Save or remove pending photos and try again.",
			409,
		);
	}
});
export const download = httpAction(async (ctx, request): Promise<Response> => {
	const userId = await actionUserId(ctx);
	if (!userId) return failure("Sign in to view profile photos.", 401);
	const photoId = new URL(request.url).searchParams.get("id") ?? "";
	const photo = await ctx.runQuery(internal.member_profile_photos.readable, {
		userId,
		photoId,
	});
	if (!photo) return failure("Photo unavailable.", 404);
	const blob = await ctx.storage.get(photo.storageId);
	if (!blob) return failure("Photo unavailable.", 404);
	return new Response(blob, {
		headers: { ...headers, "Content-Type": photo.mime },
	});
});
