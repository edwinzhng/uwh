"use node";

import { v } from "convex/values";
import { Expo } from "expo-server-sdk";
import webPush from "web-push";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { webPushConfiguration } from "./web_push_configuration";

const vapidDetails = (): {
	subject: string;
	publicKey: string;
	privateKey: string;
} => ({
	subject: process.env.WEB_PUSH_VAPID_SUBJECT ?? "",
	publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
	privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
});
export const send = internalAction({
	args: { id: v.id("webPushDeliveries") },
	handler: async (ctx, { id }): Promise<void> => {
		if (!webPushConfiguration().configured) {
			await ctx.runMutation(internal.web_push.record, {
				id,
				sent: false,
				error: "DeliveryNotConfigured",
				retry: false,
			});
			return;
		}
		const payload = await ctx.runQuery(internal.web_push.payload, { id });
		if (!payload) {
			await ctx.runMutation(internal.web_push.record, {
				id,
				sent: false,
				error: "AccessChanged",
				retry: false,
			});
			return;
		}
		try {
			await webPush.sendNotification(
				{ endpoint: payload.endpoint, keys: payload.keys },
				JSON.stringify({
					title: payload.title,
					body: payload.body,
					path: payload.path,
				}),
				{ vapidDetails: vapidDetails(), TTL: 3600, timeout: 10000 },
			);
			await ctx.runMutation(internal.web_push.record, {
				id,
				sent: true,
				retry: false,
			});
		} catch (error) {
			const status =
				error instanceof Error &&
				"statusCode" in error &&
				typeof error.statusCode === "number"
					? error.statusCode
					: 0;
			await ctx.runMutation(internal.web_push.record, {
				id,
				sent: false,
				error: status ? `PushRejected${status}` : "DeliveryUnavailable",
				retry: !status || status === 429 || status >= 500,
				expired: status === 404 || status === 410,
			});
		}
	},
});
export const test = action({
	args: {
		platform: v.union(v.literal("native"), v.literal("web")),
		installationId: v.string(),
	},
	handler: async (ctx, input): Promise<{ accepted: true }> => {
		if (!(await ctx.runQuery(internal.identity.current, {})))
			throw new Error("Sign in to send a notification test.");
		if (
			process.env.OUTBOUND_DELIVERY_DISABLED === "true" ||
			(input.platform === "web"
				? !webPushConfiguration().configured
				: process.env.PUSH_DELIVERY_ENABLED !== "true")
		)
			throw new Error(
				"Notification delivery is not configured. The activity inbox still works.",
			);
		const target = await ctx.runMutation(internal.web_push.startTest, input);
		if (target.platform === "web") {
			try {
				await webPush.sendNotification(
					target,
					JSON.stringify({
						title: "UWH Club",
						body: "Your notification test is working.",
						path: "/club",
					}),
					{ vapidDetails: vapidDetails(), TTL: 60, timeout: 10000 },
				);
			} catch {
				throw new Error(
					"The notification service did not accept this test. Enable this browser again.",
				);
			}
		} else {
			const result = (
				await new Expo({
					accessToken: process.env.EXPO_ACCESS_TOKEN,
				}).sendPushNotificationsAsync([
					{
						to: target.token,
						title: "UWH Club",
						body: "Your notification test is working.",
						data: { path: "/club" },
						sound: "default",
						channelId: "club",
						ttl: 60,
					},
				])
			).at(0);
			if (result?.status !== "ok")
				throw new Error(
					"The notification service did not accept this test. Enable this device again.",
				);
		}
		return { accepted: true };
	},
});
