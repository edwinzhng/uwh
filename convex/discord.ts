import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export const sendMessage = internalAction({
	args: { message: v.string() },
	handler: async (_ctx, args) => {
		if (!DISCORD_WEBHOOK_URL) {
			console.warn(
				"Discord webhook URL not configured, skipping message:",
				args.message,
			);
			return false;
		}

		try {
			const response = await fetch(DISCORD_WEBHOOK_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content: args.message,
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Discord API error: ${response.status} ${response.statusText}`,
				);
			}

			return true;
		} catch (error) {
			console.error("Failed to send Discord message:", error);
			return false;
		}
	},
});
