import { v } from "convex/values";
import { createRemoteJWKSet, errors } from "jose";
import type { AppleNotification } from "../src/domain/apple-notification";
import { internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";
import { verifyAppleNotification } from "./apple_notification_verification";
import { removeAuthSession } from "./auth_sessions";
import { boundedBlob } from "./request_body";

const appleKeys = createRemoteJWKSet(
	new URL("https://appleid.apple.com/auth/keys"),
);

export const receive = httpAction(async (ctx, request): Promise<Response> => {
	if (!process.env.AUTH_APPLE_ID)
		return new Response("Unavailable", { status: 503 });
	const body = await boundedBlob(request, 65536);
	if (!body) return new Response("Invalid notification", { status: 413 });
	type Result =
		| { ok: true; event: AppleNotification }
		| { ok: false; status: number };
	const result = await verifyAppleNotification(
		await body.text(),
		process.env.AUTH_APPLE_ID,
		appleKeys,
	).then(
		(event): Result => ({ ok: true, event }),
		(error: unknown): Result => ({
			ok: false,
			status:
				error instanceof SyntaxError ||
				(error instanceof errors.JOSEError &&
					error.code !== "ERR_JWKS_TIMEOUT") ||
				(error instanceof Error &&
					error.message === "Invalid Apple notification.")
					? 400
					: 503,
		}),
	);
	if (!result.ok)
		return new Response("Notification could not be verified", {
			status: result.status,
		});
	await ctx.runMutation(internal.apple_notifications.apply, result.event);
	return new Response(null, { status: 204 });
});

export const apply = internalMutation({
	args: {
		key: v.string(),
		subject: v.string(),
		type: v.union(
			v.literal("email-enabled"),
			v.literal("email-disabled"),
			v.literal("consent-revoked"),
			v.literal("account-delete"),
		),
		eventAt: v.number(),
	},
	handler: async (ctx, event): Promise<void> => {
		if (
			await ctx.db
				.query("appleNotificationReceipts")
				.withIndex("by_key", (q) => q.eq("key", event.key))
				.unique()
		)
			return;
		await ctx.db.insert("appleNotificationReceipts", {
			key: event.key,
			expiresAt: Date.now() + 30 * 86400000,
		});
		const grant = await ctx.db
			.query("appleGrants")
			.withIndex("by_subject", (q) => q.eq("subject", event.subject))
			.unique();
		if (grant?.authorizedAt && event.eventAt + 1000 < grant.authorizedAt)
			return;
		if (grant?.lastNotificationAt && event.eventAt < grant.lastNotificationAt)
			return;
		if (event.type === "email-enabled" || event.type === "email-disabled") {
			if (grant && !grant.pending)
				await ctx.db.patch(grant._id, {
					emailEnabled: event.type === "email-enabled",
					lastNotificationAt: event.eventAt,
				});
			return;
		}
		if (grant) await ctx.db.delete(grant._id);
		const account = await ctx.db
			.query("authAccounts")
			.withIndex("providerAndAccountId", (q) =>
				q.eq("provider", "apple").eq("providerAccountId", event.subject),
			)
			.unique();
		if (!account) return;
		const sessions = await ctx.db
			.query("authSessions")
			.withIndex("userId", (q) => q.eq("userId", account.userId))
			.collect();
		const endedIds = new Set(
			sessions
				.filter((session) => session._creationTime <= event.eventAt + 1000)
				.map((session) => session._id),
		);
		for (const sessionId of endedIds) await removeAuthSession(ctx, sessionId);
		for (const device of await ctx.db
			.query("pushDevices")
			.withIndex("by_user", (q) => q.eq("userId", account.userId))
			.collect())
			if (endedIds.has(device.sessionId)) await ctx.db.delete(device._id);
		if (event.type === "account-delete") {
			for (const code of await ctx.db
				.query("authVerificationCodes")
				.withIndex("accountId", (q) => q.eq("accountId", account._id))
				.collect())
				await ctx.db.delete(code._id);
			await ctx.db.delete(account._id);
		}
	},
});
