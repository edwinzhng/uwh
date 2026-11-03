import { getAuthSessionId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { notificationPayload } from "../src/domain/notification-payload";
import { validateBrowserSubscription } from "../src/domain/web-push";
import { internal } from "./_generated/api";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { getAuthUserId, requireMember } from "./identity";
import { notificationContent } from "./notification_access";
import { pushEnabled } from "./notifications";
import { webPushConfiguration } from "./web_push_configuration";

export const configuration = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{
		configured: boolean;
		publicKey?: string;
		reason?: string;
		devices: number;
	}> => {
		const member = await requireMember(ctx);
		const rows = await ctx.db
			.query("webPushSubscriptions")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.collect();
		return {
			...webPushConfiguration(),
			devices: rows.filter((row) => row.clubId === member.clubId).length,
		};
	},
});
export const register = mutation({
	args: {
		installationId: v.string(),
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string(),
		vapidKey: v.string(),
	},
	handler: async (ctx, input): Promise<void> => {
		const member = await requireMember(ctx);
		const sessionId = await getAuthSessionId(ctx);
		const configuration = webPushConfiguration();
		const error = validateBrowserSubscription({
			endpoint: input.endpoint,
			keys: input,
		});
		if (error) throw new Error(error);
		if (!sessionId || !/^[A-Za-z0-9-]{20,80}$/.test(input.installationId))
			throw new Error("Enable browser notifications again.");
		if (!configuration.configured || configuration.publicKey !== input.vapidKey)
			throw new Error(
				configuration.reason ??
					"Browser notification configuration changed. Enable again.",
			);
		const [installation, endpoints, owned] = await Promise.all([
			ctx.db
				.query("webPushSubscriptions")
				.withIndex("by_installation", (q) =>
					q.eq("installationId", input.installationId),
				)
				.collect(),
			ctx.db
				.query("webPushSubscriptions")
				.withIndex("by_endpoint", (q) => q.eq("endpoint", input.endpoint))
				.collect(),
			ctx.db
				.query("webPushSubscriptions")
				.withIndex("by_user", (q) => q.eq("userId", member.userId))
				.take(11),
		]);
		const matches = [
			...new Map(
				[...installation, ...endpoints].map((row) => [row._id, row]),
			).values(),
		];
		if (
			matches.some(
				(row) =>
					row.userId !== member.userId &&
					(row.endpoint !== input.endpoint ||
						row.p256dh !== input.p256dh ||
						row.auth !== input.auth),
			)
		)
			throw new Error("Browser notification registration failed.");
		if (
			!matches.some((row) => row.userId === member.userId) &&
			owned.length >= 10
		)
			throw new Error(
				"Disable an older browser notification registration first.",
			);
		const existing = matches.find(
			(row) =>
				row.userId === member.userId &&
				row.clubId === member.clubId &&
				row.sessionId === sessionId &&
				row.installationId === input.installationId &&
				row.endpoint === input.endpoint &&
				row.p256dh === input.p256dh &&
				row.auth === input.auth &&
				row.vapidKey === input.vapidKey,
		);
		for (const row of matches.filter((row) => row._id !== existing?._id)) {
			for (const delivery of await ctx.db
				.query("webPushDeliveries")
				.withIndex("by_subscription", (q) => q.eq("subscriptionId", row._id))
				.collect())
				await ctx.db.delete(delivery._id);
			await ctx.db.delete(row._id);
		}
		if (existing) {
			await ctx.db.patch(existing._id, { updatedAt: Date.now() });
			return;
		}
		await ctx.db.insert("webPushSubscriptions", {
			...input,
			clubId: member.clubId,
			userId: member.userId,
			sessionId,
			updatedAt: Date.now(),
		});
	},
});
export const unregister = mutation({
	args: { installationId: v.optional(v.string()) },
	handler: async (ctx, { installationId }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return;
		const rows = await ctx.db
			.query("webPushSubscriptions")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const row of rows.filter(
			(row) => !installationId || row.installationId === installationId,
		)) {
			for (const delivery of await ctx.db
				.query("webPushDeliveries")
				.withIndex("by_subscription", (q) => q.eq("subscriptionId", row._id))
				.collect())
				await ctx.db.delete(delivery._id);
			await ctx.db.delete(row._id);
		}
	},
});
export const payload = internalQuery({
	args: { id: v.id("webPushDeliveries") },
	handler: async (
		ctx,
		{ id },
	): Promise<{
		endpoint: string;
		keys: { p256dh: string; auth: string };
		title: string;
		body: string;
		path: string;
	} | null> => {
		const row = await ctx.db.get(id);
		if (!row || row.state !== "pending") return null;
		const [job, subscription] = await Promise.all([
			ctx.db.get(row.jobId),
			ctx.db.get(row.subscriptionId),
		]);
		if (
			!job ||
			!subscription ||
			subscription.userId !== row.userId ||
			subscription.clubId !== job.clubId ||
			subscription.vapidKey !== webPushConfiguration().publicKey
		)
			return null;
		const [member, user, session] = await Promise.all([
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", row.userId))
				.first(),
			ctx.db.get(row.userId),
			ctx.db.get(subscription.sessionId),
		]);
		if (
			!member ||
			member.clubId !== job.clubId ||
			!user?.emailVerificationTime ||
			!session ||
			session.userId !== row.userId ||
			session.expirationTime <= Date.now()
		)
			return null;
		const content = await notificationContent(ctx, job, member, "delivery");
		if (!content || !(await pushEnabled(ctx, job, member, content)))
			return null;
		return {
			endpoint: subscription.endpoint,
			keys: { p256dh: subscription.p256dh, auth: subscription.auth },
			...notificationPayload(job, content),
		};
	},
});
export const record = internalMutation({
	args: {
		id: v.id("webPushDeliveries"),
		sent: v.boolean(),
		error: v.optional(v.string()),
		retry: v.boolean(),
		expired: v.optional(v.boolean()),
	},
	handler: async (ctx, { id, sent, error, retry, expired }): Promise<void> => {
		const row = await ctx.db.get(id);
		if (!row) return;
		if (expired) {
			const subscription = await ctx.db.get(row.subscriptionId);
			if (subscription) await ctx.db.delete(subscription._id);
		}
		const again = retry && row.attempt < 4;
		await ctx.db.patch(id, {
			state: sent ? "sent" : again ? "pending" : "failed",
			attempt: row.attempt + 1,
			updatedAt: Date.now(),
			error,
		});
		if (again)
			await ctx.scheduler.runAfter(
				10000 * 2 ** row.attempt,
				internal.web_push_transport.send,
				{ id },
			);
	},
});
export type NotificationTestTarget =
	| { platform: "native"; token: string }
	| {
			platform: "web";
			endpoint: string;
			keys: { p256dh: string; auth: string };
	  };
export const startTest = internalMutation({
	args: {
		platform: v.union(v.literal("native"), v.literal("web")),
		installationId: v.string(),
	},
	handler: async (
		ctx,
		{ platform, installationId },
	): Promise<NotificationTestTarget> => {
		const member = await requireMember(ctx);
		const sessionId = await getAuthSessionId(ctx);
		const last = await ctx.db
			.query("notificationTests")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.unique();
		if (last && Date.now() - last.lastSentAt < 60000)
			throw new Error("Wait a minute before sending another test.");
		const rows =
			platform === "native"
				? await ctx.db
						.query("pushDevices")
						.withIndex("by_user", (q) => q.eq("userId", member.userId))
						.collect()
				: await ctx.db
						.query("webPushSubscriptions")
						.withIndex("by_user", (q) => q.eq("userId", member.userId))
						.collect();
		const device = rows.find(
			(row) =>
				row.installationId === installationId && row.sessionId === sessionId,
		);
		if (!device) throw new Error("Enable notifications on this device first.");
		if (last) await ctx.db.patch(last._id, { lastSentAt: Date.now() });
		else
			await ctx.db.insert("notificationTests", {
				userId: member.userId,
				lastSentAt: Date.now(),
			});
		return "token" in device
			? { platform: "native", token: device.token }
			: {
					platform: "web",
					endpoint: device.endpoint,
					keys: { p256dh: device.p256dh, auth: device.auth },
				};
	},
});
