import { v } from "convex/values";
import type { Member } from "../src/domain/app-types";
import {
	defaultPlayerCoaching,
	type PlayerCoaching,
	validatePlayerCoaching,
} from "../src/domain/player-coaching";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireMember } from "./identity";
import { ageGroupValue, positionValue } from "./player_coaching_schema";

export const readPlayerCoaching = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	member: Member,
): Promise<PlayerCoaching> => {
	const row = await ctx.db
		.query("playerCoaching")
		.withIndex("by_club_person", (q) =>
			q.eq("clubId", clubId).eq("personId", member.id),
		)
		.unique();
	return row
		? {
				personId: row.personId,
				rating: row.rating,
				positions: row.positions,
				ageGroup: row.ageGroup,
				revision: row.revision,
			}
		: defaultPlayerCoaching(member);
};
const requireCoach = async (
	ctx: QueryCtx,
): ReturnType<typeof requireMember> => {
	const membership = await requireMember(ctx);
	if (!membership.coachPrograms.length)
		throw new Error("Coach access required.");
	return membership;
};
export const profile = query({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<PlayerCoaching> => {
		const membership = await requireCoach(ctx);
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", membership.clubId).eq("value.id", personId),
			)
			.unique();
		if (!member) throw new Error("Player not found.");
		return readPlayerCoaching(ctx, membership.clubId, member.value);
	},
});
export const save = mutation({
	args: {
		personId: v.string(),
		rating: v.number(),
		positions: v.array(positionValue),
		ageGroup: ageGroupValue,
		revision: v.number(),
	},
	handler: async (ctx, values): Promise<void> => {
		const membership = await requireCoach(ctx);
		validatePlayerCoaching(values);
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", membership.clubId).eq("value.id", values.personId),
			)
			.unique();
		if (!member) throw new Error("Player not found.");
		const current = await ctx.db
			.query("playerCoaching")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", membership.clubId).eq("personId", values.personId),
			)
			.unique();
		if (values.revision !== (current?.revision ?? 0))
			throw new Error("Player details changed. Reopen and try again.");
		const next = { ...values, revision: values.revision + 1 };
		if (current) await ctx.db.patch(current._id, next);
		else
			await ctx.db.insert("playerCoaching", {
				clubId: membership.clubId,
				...next,
			});
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
			.collect();
		for (const team of teams.filter((entry) =>
			[...entry.value.black, ...entry.value.white].includes(values.personId),
		)) {
			await ctx.db.patch(team._id, {
				value: { ...team.value, published: false, coachingStale: true },
			});
		}
	},
});
