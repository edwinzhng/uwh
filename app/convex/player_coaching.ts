import { v } from "convex/values";
import type { Member } from "../src/domain/app-types";
import { lineupIncludesPerson } from "../src/domain/lineup";
import {
	balancingProfileChanged,
	coachScoreAverage,
	defaultPlayerCoaching,
	type PlayerCoaching,
	validatePlayerCoaching,
} from "../src/domain/player-coaching";
import { withPlayerPositions } from "../src/domain/position-flow";
import type { Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";
import { assertCanonicalMember } from "./member_alias";
import {
	ageGroupValue,
	coachingGenderValue,
	positionValue,
} from "./player_coaching_schema";

export const readPlayerCoaching = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	member: Member,
	activeCoachIds?: readonly string[],
): Promise<PlayerCoaching> => {
	const row = await ctx.db
		.query("playerCoaching")
		.withIndex("by_club_person", (q) =>
			q.eq("clubId", clubId).eq("personId", member.id),
		)
		.unique();
	const coachIds = row?.scores?.length
		? (activeCoachIds ?? (await rankingCoachIds(ctx, clubId)))
		: [];
	const average = row?.scores?.length
		? coachScoreAverage(
				row.scores.filter((entry) => coachIds.includes(entry.coachId)),
			)
		: undefined;
	return row
		? {
				scores: row.scores,
				personId: row.personId,
				rating: row.scores?.length ? (average ?? 0) : row.rating,
				ratingKnown: row.scores?.length
					? average !== undefined
					: row.ratingKnown,
				positions: row.positions,
				ageGroup: row.ageGroup,
				gender: row.gender,
				revision: row.revision,
			}
		: defaultPlayerCoaching(member);
};
export const rankingCoachIds = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<string[]> =>
	(
		await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect()
	)
		.filter((entry) => entry.coachPrograms.length > 0)
		.map((entry) => entry.userId);
const requireCoach = async (
	ctx: QueryCtx,
): ReturnType<typeof requireMember> => {
	const membership = await requireMember(ctx);
	if (!membership.coachPrograms.length)
		throw new Error("Coach access required.");
	return membership;
};
export const writePlayerCoaching = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	values: PlayerCoaching,
): Promise<void> => {
	validatePlayerCoaching(values);
	await assertCanonicalMember(ctx, clubId, values.personId);
	const member = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", values.personId),
		)
		.unique();
	if (!member) throw new Error("Player not found.");
	const current = await ctx.db
		.query("playerCoaching")
		.withIndex("by_club_person", (q) =>
			q.eq("clubId", clubId).eq("personId", values.personId),
		)
		.unique();
	if (values.revision !== (current?.revision ?? 0))
		throw new Error("Player details changed. Reopen and try again.");
	const next = {
		...values,
		gender: values.gender,
		revision: values.revision + 1,
	};
	if (current) await ctx.db.patch(current._id, next);
	else await ctx.db.insert("playerCoaching", { clubId, ...next });
	if (
		!balancingProfileChanged(
			current ?? defaultPlayerCoaching(member.value),
			values,
		)
	)
		return;
	const teams = await ctx.db
		.query("teams")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect();
	for (const team of teams.filter((entry) =>
		lineupIncludesPerson(entry.value, values.personId),
	)) {
		await ctx.db.patch(team._id, {
			value: { ...team.value, published: false, coachingStale: true },
		});
	}
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
		ratingKnown: v.optional(v.boolean()),
		positions: v.array(positionValue),
		ageGroup: ageGroupValue,
		gender: v.optional(coachingGenderValue),
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
		const current = await readPlayerCoaching(
			ctx,
			membership.clubId,
			member.value,
		);
		await writePlayerCoaching(ctx, membership.clubId, {
			...values,
			...(current.scores?.length
				? { rating: current.rating, ratingKnown: current.ratingKnown }
				: {}),
		});
	},
});

export const rankings = query({
	args: {},
	handler: async (ctx) => {
		const actor = await requireCoach(ctx);
		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		const coaches = memberships.filter(
			(entry) => entry.coachPrograms.length > 0,
		);
		const members = await ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		const profiles = await ctx.db
			.query("playerCoaching")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		return members
			.filter(
				({ value }) =>
					!value.archived && !value.mergedInto && value.programs.length > 0,
			)
			.map(({ value }) => {
				const profile = profiles.find((entry) => entry.personId === value.id);
				const scores = (profile?.scores ?? []).filter((entry) =>
					coaches.some((coach) => coach.userId === entry.coachId),
				);
				return {
					personId: value.id,
					name: value.name,
					scores,
					coachCount: coaches.length,
					ownCoachId: actor.userId,
					positions:
						profile?.positions ?? defaultPlayerCoaching(value).positions,
					profileRevision: profile?.revision ?? 0,
				};
			});
	},
});

export const score = mutation({
	args: {
		personId: v.string(),
		score: v.number(),
		expectedRevision: v.number(),
	},
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireCoach(ctx);
		if (!Number.isFinite(args.score) || args.score < 0 || args.score > 100)
			throw new Error("Use a score from 0–100");
		await assertCanonicalMember(ctx, actor.clubId, args.personId);
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (!member || member.value.archived || !member.value.programs.length)
			throw new Error("Choose an active player.");
		const current = await readPlayerCoaching(ctx, actor.clubId, member.value);
		const own = current.scores?.find((entry) => entry.coachId === actor.userId);
		if ((own?.revision ?? 0) !== args.expectedRevision)
			throw new Error(
				"Your score changed elsewhere. Reopen this player to update it.",
			);
		const scores = [
			...(current.scores ?? []).filter(
				(entry) => entry.coachId !== actor.userId,
			),
			{
				coachId: actor.userId,
				score: args.score,
				revision: args.expectedRevision + 1,
			},
		];
		const coaches = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		const rating = coachScoreAverage(
			scores.filter((entry) =>
				coaches.some(
					(coach) =>
						coach.coachPrograms.length > 0 && coach.userId === entry.coachId,
				),
			),
		);
		await writePlayerCoaching(ctx, actor.clubId, {
			...current,
			scores,
			rating: rating ?? 0,
			ratingKnown: rating !== undefined,
		});
	},
});

export const teamStrength = query({
	args: { personIds: v.array(v.string()) },
	handler: async (ctx, { personIds }) => {
		const actor = await requireCoach(ctx);
		if (personIds.length > 200) throw new Error("Choose up to 200 players.");
		const coachIds = await rankingCoachIds(ctx, actor.clubId);
		return Promise.all(
			[...new Set(personIds)].map(async (personId) => {
				const member = await ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", actor.clubId).eq("value.id", personId),
					)
					.unique();
				if (!member || member.value.archived || member.value.mergedInto)
					return { personId, rating: 0, ratingKnown: false };
				const profile = await readPlayerCoaching(
					ctx,
					actor.clubId,
					member.value,
					coachIds,
				);
				return {
					personId,
					rating: profile.rating,
					ratingKnown: profile.ratingKnown !== false,
				};
			}),
		);
	},
});

export const eraseCoachScores = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	coachId: string,
): Promise<void> => {
	const profiles = (
		await ctx.db
			.query("playerCoaching")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect()
	).filter((entry) => entry.scores?.some((score) => score.coachId === coachId));
	if (!profiles.length) return;
	const active = (await rankingCoachIds(ctx, clubId)).filter(
		(id) => id !== coachId,
	);
	for (const profile of profiles) {
		const scores =
			profile.scores?.filter((entry) => entry.coachId !== coachId) ?? [];
		const rating = coachScoreAverage(
			scores.filter((entry) => active.includes(entry.coachId)),
		);
		await ctx.db.patch(profile._id, {
			scores,
			rating: rating ?? 0,
			ratingKnown: rating !== undefined,
			revision: profile.revision + 1,
		});
	}
	const people = new Set(profiles.map((entry) => entry.personId));
	const teams = await ctx.db
		.query("teams")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect();
	for (const team of teams.filter((entry) =>
		[...people].some((personId) => lineupIncludesPerson(entry.value, personId)),
	))
		await ctx.db.patch(team._id, {
			value: { ...team.value, published: false, coachingStale: true },
		});
};

export const positions = mutation({
	args: {
		personId: v.string(),
		positions: v.array(positionValue),
		expectedRevision: v.number(),
	},
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireCoach(ctx);
		await assertCanonicalMember(ctx, actor.clubId, args.personId);
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (
			!member ||
			member.value.archived ||
			member.value.mergedInto ||
			!member.value.programs.length
		)
			throw new Error("Choose an active player.");
		const current = await readPlayerCoaching(ctx, actor.clubId, member.value);
		await writePlayerCoaching(
			ctx,
			actor.clubId,
			withPlayerPositions(current, args.positions, args.expectedRevision),
		);
	},
});
