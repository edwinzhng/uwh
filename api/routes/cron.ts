import { Hono } from "hono";
import { discordService } from "../lib/services/discord.service";
import { practiceService } from "../lib/services/practice.service";

const app = new Hono();

// Send hockey practice reminders for events in the next 48 hours
app.get("/send-hockey-reminders", async (c) => {
	try {
		const now = new Date();
		const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

		// Get all future practices
		const practices = await practiceService.getPractices();

		// Filter for practices in next 48 hours that contain "Hockey" in notes
		const upcomingHockeyPractices = practices.filter((practice) => {
			const practiceDate = new Date(practice.date);
			const isInNext48Hours = practiceDate >= now && practiceDate <= in48Hours;
			const hasHockey =
				practice.notes?.toLowerCase().includes("hockey") ?? false;

			return isInNext48Hours && hasHockey;
		});

		console.info(
			`Found ${upcomingHockeyPractices.length} hockey practices in next 48 hours`,
			{ upcomingHockeyPractices, now, in48Hours, practices },
		);

		if (upcomingHockeyPractices.length === 0) {
			return c.json({
				success: true,
				message: "No hockey practices found in next 48 hours",
				practicesFound: 0,
			});
		}

		// Send reminder message to Discord
		const message = "Reminder: create teams for hockey practice tomorrow";
		await discordService.sendMessage(message);

		return c.json({
			success: true,
			message: "Reminder sent successfully",
			practicesFound: upcomingHockeyPractices.length,
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
