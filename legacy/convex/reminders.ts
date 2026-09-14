import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { SportEasyEventDetail } from "./sporteasy";

const WEEKLY_SKILLS = [
	"Curling",
	"Flicking & stick control",
	"Tackling",
	"Positioning",
	"Team skills (2 on 1, weave, etc.)",
];

export const sendHockeyReminders = internalAction({
	args: {},
	handler: async (ctx) => {
		const upcomingPractices = await ctx.runQuery(
			internal.practices.getUpcomingWeeklyPractices,
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

				const eventResponse = (await ctx.runAction(
					internal.sporteasy.getEventAttendees,
					{
						practiceId: practice._id,
					},
				)) as SportEasyEventDetail;

				const presentSportEasyIds = new Set<number>();
				for (const attendee of eventResponse.attendees) {
					if (attendee.attendance_status === "present") {
						for (const result of attendee.results) {
							presentSportEasyIds.add(result.profile.id);
						}
					}
				}

				const presentPlayers = await ctx.runQuery(
					internal.players.getPlayersBySportEasyIds,
					{
						sporteasyIds: Array.from(presentSportEasyIds),
					},
				);

				if (presentPlayers.length < 6) {
					console.log(`Not enough players for practice ${practice._id}`);
					continue;
				}

				const responseMessage = await ctx.runAction(
					internal.teamGenerator.generateTeamsAndMessage,
					{
						players: presentPlayers,
					},
				);

				await ctx.runAction(internal.discord.sendMessage, {
					message: "Reminder: create teams for hockey practice tomorrow",
				});

				const practiceDate = new Date(practice.date);
				const startOfYear = new Date(practiceDate.getFullYear(), 0, 1);
				const diff = practiceDate.getTime() - startOfYear.getTime();
				const oneWeek = 1000 * 60 * 60 * 24 * 7;
				const weekNumber = Math.floor(diff / oneWeek);
				const skillIndex = weekNumber % WEEKLY_SKILLS.length;
				const skill = WEEKLY_SKILLS.at(skillIndex) || "";

				const teamsMessageFull = `🏒 **Generated teams**\n\n${responseMessage}\n\n**Skill of the week:** ${skill}`;
				await ctx.runAction(internal.discord.sendMessage, {
					message: teamsMessageFull,
				});

				await ctx.runMutation(api.practices.updatePractice, {
					id: practice._id,
					discordReminderSentAt: Date.now(),
				});
			} catch (e) {
				console.error(`Error processing practice ${practice._id}:`, e);
			}
		}
	},
});
