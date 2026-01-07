import { Hono } from "hono";
import { discordService } from "../lib/services/discord.service";
import { practiceService } from "../lib/services/practice.service";

const app = new Hono();

// Send hockey practice reminders for tomorrow's events
app.get("/send-hockey-reminders", async (c) => {
	try {
		// Get tomorrow's date range
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const dayAfterTomorrow = new Date(tomorrow);
		dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

		// Get all future practices
		const practices = await practiceService.getPractices();

		// Filter for tomorrow's practices that contain "Hockey" in notes (case-insensitive)
		const tomorrowHockeyPractices = practices.filter((practice) => {
			const practiceDate = new Date(practice.date);
			const isOnTomorrow =
				practiceDate >= tomorrow && practiceDate < dayAfterTomorrow;
			const hasHockey =
				practice.notes?.toLowerCase().includes("hockey") ?? false;
			return isOnTomorrow && hasHockey;
		});

		if (tomorrowHockeyPractices.length === 0) {
			return c.json({
				success: true,
				message: "No hockey practices found for tomorrow",
				practicesFound: 0,
			});
		}

		// Send reminder message to Discord
		const message =
			"Reminder: Please create teams for tomorrow's hockey practice";
		await discordService.sendMessage(message);

		return c.json({
			success: true,
			message: "Reminder sent successfully",
			practicesFound: tomorrowHockeyPractices.length,
		});
	} catch (error) {
		console.error("Error sending hockey reminders:", error);
		return c.json(
			{
				success: false,
				error: "Failed to send hockey reminders",
			},
			500,
		);
	}
});

export default app;

