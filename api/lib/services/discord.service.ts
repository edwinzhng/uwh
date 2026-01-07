import "dotenv/config";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
	console.warn("Warning: DISCORD_WEBHOOK_URL environment variable is not set");
}

export class DiscordService {
	private static instance: DiscordService;

	static getInstance(): DiscordService {
		if (!DiscordService.instance) {
			DiscordService.instance = new DiscordService();
		}
		return DiscordService.instance;
	}

	async sendMessage(message: string): Promise<void> {
		if (!DISCORD_WEBHOOK_URL) {
			throw new Error("Discord webhook URL is not configured");
		}

		try {
			const response = await fetch(DISCORD_WEBHOOK_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ content: message }),
			});

			if (!response.ok) {
				throw new Error(
					`Discord API error: ${response.status} ${response.statusText}`,
				);
			}
		} catch (error) {
			console.error("Error sending Discord message:", error);
			throw error;
		}
	}
}

export const discordService = DiscordService.getInstance();

