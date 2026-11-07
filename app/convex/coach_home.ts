import { v } from "convex/values";
import type { ClubEvent, Season } from "../src/domain/app-types";
import {
	type CoachHomePlayers,
	coachHomePlayers,
	coachHomePracticeEnds,
	coachingPracticeEnd,
} from "../src/domain/coach-home";
import { practiceEvent } from "../src/domain/event-types";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { effectiveEventCoaches } from "./coaching_schedule";
import { requireMember } from "./identity";

const requireStaff = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.coachPrograms.length && !actor.admin)
		throw new Error("Coach or admin access required.");
	return actor;
};
const findSeason = (
	club: Doc<"clubs"> | null,
	seasonId: string,
): Season | undefined =>
	(club?.seasons ?? initialSeasons).find((entry) => entry.id === seasonId);

export const players = query({
	args: { seasonId: v.string() },
	handler: async (ctx, { seasonId }): Promise<CoachHomePlayers | null> => {
		const actor = await requireStaff(ctx);
		const [club, members, profiles, coaching] = await Promise.all([
			ctx.db.get(actor.clubId),
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
		]);
		const season = findSeason(club, seasonId);
		if (
			!season ||
			members.length > 500 ||
			profiles.length > 500 ||
			coaching.length > 500
		)
			return null;
		const profileByPerson = new Map(
			profiles.map((profile) => [profile.personId, profile]),
		);
		const genderByPerson = new Map(
			coaching.map((entry) => [entry.personId, entry.gender]),
		);
		return coachHomePlayers(
			members.map((entry) => entry.value),
			members.map(({ value }) => {
				const profile = profileByPerson.get(value.id);
				return {
					personId: value.id,
					birthDate: profile?.birthDate,
					gender: profile?.competitionGender ?? genderByPerson.get(value.id),
				};
			}),
			season,
		);
	},
});

export const practiceEnds = query({
	args: { seasonId: v.string() },
	handler: async (ctx, { seasonId }): Promise<number[] | null> => {
		const actor = await requireStaff(ctx);
		const club = await ctx.db.get(actor.clubId);
		const season = findSeason(club, seasonId);
		if (!season) return null;
		const events = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.gte("value.date", season.start)
					.lte("value.date", season.end),
			)
			.take(2001);
		if (events.length > 2000) return null;
		return coachHomePracticeEnds(
			events.map((row) => row.value),
			season,
			club?.timeZone,
		);
	},
});

export const upcoming = query({
	args: { day: v.string() },
	handler: async (
		ctx,
		{ day },
	): Promise<{
		practices: { event: ClubEvent; endsAt: number }[];
		morePractices: boolean;
	}> => {
		const actor = await requireStaff(ctx);
		if (!actor.coachPrograms.length || !/^\d{4}-\d{2}-\d{2}$/.test(day))
			return { practices: [], morePractices: false };
		const [club, rows] = await Promise.all([
			ctx.db.get(actor.clubId),
			ctx.db
				.query("events")
				.withIndex("by_date", (q) =>
					q.eq("clubId", actor.clubId).gte("value.date", day),
				)
				.take(201),
		]);
		const events = rows
			.map((row) => row.value)
			.filter((event) => !event.cancelled && practiceEvent(event));
		const practices: { event: ClubEvent; endsAt: number }[] = [];
		for (const event of events.slice(0, 80)) {
			const { assignments } = await effectiveEventCoaches(
				ctx,
				actor.clubId,
				event,
			);
			const endsAt = coachingPracticeEnd(
				event,
				assignments,
				actor.userId,
				club?.timeZone,
			);
			if (endsAt !== undefined) {
				practices.push({ event, endsAt });
				if (event.date > day) break;
			}
		}
		return {
			practices,
			morePractices: events.length > 80 || rows.length > 200,
		};
	},
});
