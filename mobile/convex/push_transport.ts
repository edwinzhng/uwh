"use node";

import { v } from "convex/values";
import { Expo } from "expo-server-sdk";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
export const send = internalAction({
	args: { id: v.id("pushDeliveries") },
	handler: async (ctx, { id }): Promise<void> => {
		const payload = await ctx.runQuery(internal.notifications.payload, { id });
		if (!payload) {
			await ctx.runMutation(internal.notifications.record, {
				id,
				error: "AccessChanged",
				retry: false,
			});
			return;
		}
		if (process.env.PUSH_DELIVERY_ENABLED !== "true") {
			await ctx.runMutation(internal.notifications.record, {
				id,
				error: "DeliveryNotConfigured",
				retry: false,
			});
			return;
		}
		try {
			const tickets = await expo.sendPushNotificationsAsync([
				{
					to: payload.token,
					title: payload.title,
					body: payload.body,
					data: { path: payload.path },
					sound: "default",
					channelId: "club",
					ttl: 3600,
				},
			]);
			const ticket = tickets.at(0);
			await ctx.runMutation(internal.notifications.record, {
				id,
				ticketId: ticket?.status === "ok" ? ticket.id : undefined,
				error:
					ticket?.status === "error"
						? (ticket.details?.error ?? "PushRejected")
						: undefined,
				retry:
					ticket?.status === "error" &&
					ticket.details?.error === "MessageRateExceeded",
			});
		} catch {
			await ctx.runMutation(internal.notifications.record, {
				id,
				error: "DeliveryUnavailable",
				retry: true,
			});
		}
	},
});
export const receipt = internalAction({
	args: { id: v.id("pushDeliveries"), attempt: v.number() },
	handler: async (ctx, { id, attempt }): Promise<void> => {
		const row = await ctx.runQuery(internal.notifications.receiptInfo, { id });
		if (row?.state !== "sent" || !row.ticketId) return;
		try {
			const receipts = await expo.getPushNotificationReceiptsAsync([
				row.ticketId,
			]);
			const receipt = receipts[row.ticketId];
			if (receipt) {
				await ctx.runMutation(internal.notifications.record, {
					id,
					error:
						receipt.status === "error"
							? (receipt.details?.error ?? "ReceiptRejected")
							: undefined,
					retry: false,
					delivered: receipt.status === "ok",
				});
				return;
			}
		} catch {}
		if (attempt < 3)
			await ctx.scheduler.runAfter(900000, internal.push_transport.receipt, {
				id,
				attempt: attempt + 1,
			});
		else
			await ctx.runMutation(internal.notifications.record, {
				id,
				error: "ReceiptUnavailable",
				retry: false,
			});
	},
});
