import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import { type CoachHomeStats, coachHomeStats } from "../src/domain/coach-home";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { practiceEvent } from "../src/domain/event-types";
import { initialSeasons } from "../src/domain/seasons";
import { query } from "./_generated/server";
import { effectiveEventCoaches } from "./coaching_schedule";
import { requireMember } from "./identity";

export const read = query({
	args: { seasonId: v.string(), now: v.number() },
	handler: async (
		ctx,
		{ seasonId, now },
	): Promise<{
		stats: CoachHomeStats;
		nextPractice?: ClubEvent;
		morePractices: boolean;
	}> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length && !actor.admin)
			throw new Error("Coach or admin access required.");
		const club = await ctx.db.get(actor.clubId);
		const season = (club?.seasons ?? initialSeasons).find(
			(entry) => entry.id === seasonId,
		);
		if (!season) throw new Error("Season not found.");
		const currentTime = Math.min(now, Date.now());
		const [members, profiles, coaching, events, nextEvents] = await Promise.all(
			[
				ctx.db
					.query("members")
					.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
					.take(501),
				ctx.db
					.query("memberProfiles")
					.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
					.take(501),
				ctx.db
					.query("playerCoaching")
					.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
					.take(501),
				ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.gte("value.date", season.start)
							.lte("value.date", season.end),
					)
					.take(2001),
				ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.gte("value.date", clubDate(currentTime, club?.timeZone)),
					)
					.take(201),
			],
		);
		if (
			members.length > 500 ||
			profiles.length > 500 ||
			coaching.length > 500 ||
			events.length > 2000
		)
			throw new Error("Club statistics are unavailable for this club size.");
		const genders = new Map(
			coaching.map((entry) => [entry.personId, entry.gender]),
		);
		const details = profiles.map((entry) => ({
			personId: entry.personId,
			birthDate: entry.birthDate,
			gender: entry.competitionGender ?? genders.get(entry.personId),
		}));
		const missingProfile = coaching
			.filter(
				(entry) =>
					!profiles.some((profile) => profile.personId === entry.personId),
			)
			.map((entry) => ({ personId: entry.personId, gender: entry.gender }));
		const stats = coachHomeStats(
			members.map((entry) => entry.value),
			[...details, ...missingProfile],
			events.map((entry) => entry.value),
			season,
			currentTime,
			club?.timeZone,
		);
		const upcoming = nextEvents
			.map((entry) => entry.value)
			.filter(
				(event) =>
					!event.cancelled &&
					practiceEvent(event) &&
					clubTimestamp(
						event.endDate ?? event.date,
						event.end,
						event.timeZone ?? club?.timeZone,
					) > currentTime,
			)
			.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
		const matches = await Promise.all(
			(actor.coachPrograms.length ? upcoming.slice(0, 80) : []).map(
				async (event) => {
					const { assignments } = await effectiveEventCoaches(
						ctx,
						actor.clubId,
						event,
					);
					return assignments.some(
						(assignment) =>
							assignment.coachId === actor.userId &&
							(!event.parts?.length ||
								event.parts.some(
									(part) =>
										(!assignment.partIds ||
											assignment.partIds.includes(part.id)) &&
										clubTimestamp(
											event.date,
											part.end,
											event.timeZone ?? club?.timeZone,
										) > currentTime,
								)),
					)
						? event
						: undefined;
				},
			),
		);
		return {
			stats,
			nextPractice: matches.find((event) => event !== undefined),
			morePractices: upcoming.length > 80 || nextEvents.length > 200,
		};
	},
});
