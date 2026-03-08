import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import type { SportEasyEventDetail } from "./sporteasy";

// Mock discord service for now until we move it properly, or we can use fetch
const sendDiscordMessage = async (message: string) => {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
	if (!webhookUrl) {
		console.warn(
			"Discord webhook URL not configured, skipping message:",
			message,
		);
		return false;
	}

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: message,
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
};

const WEEKLY_SKILLS = [
	"Curling",
	"Flicking & stick control",
	"Tackling",
	"Positioning",
	"Team skills (2 on 1, weave, etc.)",
];

// This action is the entry point for the cron job
export const sendHockeyReminders = internalAction({
	args: {},
	handler: async (ctx) => {
		const upcomingPractices = await ctx.runQuery(
			internal.cron.getUpcomingPracticesForReminders,
		);

		if (upcomingPractices.length === 0) {
			console.log("No hockey practices found in next 48 hours");
			return;
		}

		for (const practice of upcomingPractices) {
			try {
				if (!practice.sporteasyId) {
					console.warn(
						`Practice ${practice._id} has no SportEasy ID, skipping`,
					);
					continue;
				}

				// Get attendees using the action we defined in sporteasy.ts
				const eventResponse = await ctx.runAction(
					api.sporteasy.getEventAttendees,
					{
						practiceId: practice._id,
					},
				) as SportEasyEventDetail;

				const presentSportEasyIds = new Set<number>();
				for (const attendee of eventResponse.attendees) {
					if (attendee.attendance_status === "present") {
						for (const result of attendee.results) {
							presentSportEasyIds.add(result.profile.id);
						}
					}
				}

				const presentPlayers = await ctx.runQuery(
					internal.cron.getPlayersBySporteasyIds,
					{
						sporteasyIds: Array.from(presentSportEasyIds),
					},
				);

				if (presentPlayers.length < 6) {
					console.log(`Not enough players for practice ${practice._id}`);
					continue;
				}

				// Generate teams and message
				const responseMessage = await ctx.runAction(
					internal.teamGenerator.generateTeamsAndMessage,
					{
						players: presentPlayers,
					},
				);

				// Send reminder message
				await sendDiscordMessage(
					"Reminder: create teams for hockey practice tomorrow",
				);

				// Calculate skill of the week by week number
				const practiceDate = new Date(practice.date);
				const startOfYear = new Date(practiceDate.getFullYear(), 0, 1);
				const diff = practiceDate.getTime() - startOfYear.getTime();
				const oneWeek = 1000 * 60 * 60 * 24 * 7;
				const weekNumber = Math.floor(diff / oneWeek);
				const skillIndex = weekNumber % WEEKLY_SKILLS.length;
				const skill = WEEKLY_SKILLS[skillIndex] || "";

				const teamsMessageFull = `🏒 **Generated teams**\n\n${responseMessage}\n\n**Skill of the week:** ${skill}`;
				await sendDiscordMessage(teamsMessageFull);

				// Mark as sent
				await ctx.runMutation(internal.cron.markReminderSent, {
					practiceId: practice._id,
				});
			} catch (e) {
				console.error(`Error processing practice ${practice._id}:`, e);
			}
		}
	},
});

export const getUpcomingPracticesForReminders = internalQuery({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const in48Hours = now + 48 * 60 * 60 * 1000;

		const allPractices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.gte("date", now).lte("date", in48Hours))
			.collect();

		return allPractices.filter((p) => {
			const isPractice =
				p.notes?.toLowerCase().includes("training") ||
				p.notes?.toLowerCase().includes("hockey") ||
				p.notes?.toLowerCase().includes("practice");
			return isPractice && !p.discordReminderSentAt;
		});
	},
});

export const getPlayersBySporteasyIds = internalQuery({
	args: { sporteasyIds: v.array(v.number()) },
	handler: async (ctx, args) => {
		const players = await ctx.db.query("players").collect();
		return players.filter(
			(p) => p.sporteasyId && args.sporteasyIds.includes(p.sporteasyId),
		);
	},
});

export const markReminderSent = internalMutation({
	args: { practiceId: v.id("practices") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.practiceId, {
			discordReminderSentAt: Date.now(),
		});
	},
});

const crons = cronJobs();

// Send reminders every day at 12pm
crons.daily(
	"Send hockey practice reminders",
	{ hourUTC: 18, minuteUTC: 0 }, // Adjust to local timezone as needed (noon MST is roughly 19:00 UTC during winter, 18:00 UTC during summer)
	internal.cron.sendHockeyReminders,
);

export default crons;
