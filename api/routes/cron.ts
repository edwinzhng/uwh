import { Hono } from "hono";
import { discordService } from "../lib/services/discord.service";
import { playerService } from "../lib/services/player.service";
import { practiceService } from "../lib/services/practice.service";
import { sportEasyService } from "../lib/services/sporteasy.service";
import { teamGeneratorService } from "../lib/services/team-generator.service";

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

		// Get all players from database
		const allPlayers = await playerService.getPlayers();

		// Process each practice and generate teams
		const results = [];

		for (const practice of upcomingHockeyPractices) {
			try {
				if (!practice.sporteasyId) {
					console.warn(`Practice ${practice.id} has no SportEasy ID, skipping`);
					results.push({
						practiceId: practice.id,
						success: false,
						error: "No SportEasy ID",
					});
					continue;
				}

				// Fetch attendees from SportEasy
				const eventResponse = await sportEasyService.getEventAttendees(
					practice.sporteasyId,
				);

				// Find present players by matching SportEasy IDs
				const presentSportEasyIds = new Set<number>();
				for (const attendee of eventResponse.attendees) {
					if (attendee.attendance_status === "present") {
						for (const result of attendee.results) {
							presentSportEasyIds.add(result.profile.id);
						}
					}
				}

				const presentPlayers = allPlayers.filter(
					(player) =>
						player.sporteasyId && presentSportEasyIds.has(player.sporteasyId),
				);

				console.info(
					`Practice ${practice.id}: ${presentPlayers.length} present players`,
				);

				if (presentPlayers.length < 2) {
					results.push({
						practiceId: practice.id,
						success: false,
						error: "Not enough players",
						playerCount: presentPlayers.length,
					});
					continue;
				}

				// Generate teams
				const teams = teamGeneratorService.generateTeams(presentPlayers);
				const teamsMessage = teamGeneratorService.formatTeamsMessage(teams);

				// Format practice date
				const practiceDate = new Date(practice.date);
				const dateStr = practiceDate.toLocaleDateString("en-US", {
					weekday: "long",
					month: "short",
					day: "numeric",
				});

				// Send reminder message first
				const reminderMessage = `Reminder: create teams for hockey practice tomorrow (${dateStr})`;
				await discordService.sendMessage(reminderMessage);

				// Then send the auto-generated teams
				const teamsMessageFull = `🏒 **Generated teams - ${dateStr}**\n\n${teamsMessage}`;
				await discordService.sendMessage(teamsMessageFull);

				results.push({
					practiceId: practice.id,
					success: true,
					playerCount: presentPlayers.length,
					blackTeamCount: teams.blackTeam.length,
					whiteTeamCount: teams.whiteTeam.length,
				});
			} catch (practiceError) {
				console.error(
					`Error processing practice ${practice.id}:`,
					practiceError,
				);
				results.push({
					practiceId: practice.id,
					success: false,
					error: String(practiceError),
				});
			}
		}

		return c.json({
			success: true,
			message: "Reminders processed",
			practicesFound: upcomingHockeyPractices.length,
			results,
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
