import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
	assertDevelopmentReopen,
	assertDevelopmentVersion,
	type DevelopmentCoach,
	DevelopmentError,
	type DevelopmentPlayer,
	developmentPlayer,
	finalizedDevelopmentRating,
	nextDevelopmentReview,
	nextDevelopmentRound,
	requireDevelopmentCoach,
} from "../src/domain/development";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requiredDevelopmentCoaches } from "./development_policy";
import { requireMember } from "./identity";
import { readPlayerCoaching, writePlayerCoaching } from "./player_coaching";

const developmentGuard = <Value>(operation: () => Value): Value => {
	try {
		return operation();
	} catch (error) {
		if (error instanceof DevelopmentError) throw new ConvexError(error.message);
		throw error;
	}
};

const requireCoach = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const membership = await requireMember(ctx);
	developmentGuard(() => requireDevelopmentCoach(membership));
	return membership;
};

const clubCoaches = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<DevelopmentCoach[]> => requiredDevelopmentCoaches(ctx, clubId);

const findPlayer = (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"members"> | null> =>
	ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", personId),
		)
		.unique();

const playerMember = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"members">> => {
	const member = await findPlayer(ctx, clubId, personId);
	if (!member || member.value.programs.length === 0)
		throw new ConvexError("Player not found.");
	if (member.value.archived)
		throw new ConvexError("Restore the player before updating reviews.");
	return member;
};

const latestRound = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"developmentRounds"> | undefined> =>
	(await ctx.db
		.query("developmentRounds")
		.withIndex("by_club_person_round", (q) =>
			q.eq("clubId", clubId).eq("personId", personId),
		)
		.order("desc")
		.first()) ?? undefined;

const playerSummary = async (
	ctx: QueryCtx,
	membership: Doc<"memberships">,
	member: Doc<"members">,
	coaches: DevelopmentCoach[],
): Promise<DevelopmentPlayer> => {
	const [round, profile] = await Promise.all([
		latestRound(ctx, membership.clubId, member.value.id),
		readPlayerCoaching(ctx, membership.clubId, member.value),
	]);
	const reviews = round
		? await ctx.db
				.query("developmentReviews")
				.withIndex("by_club_person_round", (q) =>
					q
						.eq("clubId", membership.clubId)
						.eq("personId", member.value.id)
						.eq("round", round.round),
				)
				.collect()
		: [];
	return developmentPlayer(
		member.value,
		profile,
		round,
		reviews,
		coaches,
		membership.userId,
	);
};

export const overview = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ paginationOpts },
	): Promise<PaginationResult<DevelopmentPlayer>> => {
		const membership = await requireCoach(ctx);
		const [coaches, result] = await Promise.all([
			clubCoaches(ctx, membership.clubId),
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.filter((q) =>
					q.and(
						q.neq(q.field("value.programs"), []),
						q.neq(q.field("value.archived"), true),
					),
				)
				.paginate({
					...paginationOpts,
					numItems: Math.min(20, Math.max(1, paginationOpts.numItems)),
					maximumRowsRead: 100,
				}),
		]);
		return {
			...result,
			page: await Promise.all(
				result.page.map((member) =>
					playerSummary(ctx, membership, member, coaches),
				),
			),
		};
	},
});

export const player = query({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<DevelopmentPlayer | null> => {
		const membership = await requireCoach(ctx);
		const [member, coaches] = await Promise.all([
			findPlayer(ctx, membership.clubId, personId),
			clubCoaches(ctx, membership.clubId),
		]);
		if (!member || member.value.programs.length === 0) return null;
		return playerSummary(ctx, membership, member, coaches);
	},
});

export const save = mutation({
	args: {
		personId: v.string(),
		round: v.number(),
		revision: v.number(),
		rating: v.optional(v.number()),
		observation: v.string(),
		submit: v.boolean(),
	},
	handler: async (ctx, input): Promise<void> => {
		const membership = await requireCoach(ctx);
		const member = await playerMember(ctx, membership.clubId, input.personId);
		const [previousRound, coaches, profile] = await Promise.all([
			latestRound(ctx, membership.clubId, input.personId),
			clubCoaches(ctx, membership.clubId),
			readPlayerCoaching(ctx, membership.clubId, member.value),
		]);
		const now = Date.now();
		const round =
			previousRound ??
			nextDevelopmentRound(
				input.personId,
				undefined,
				profile,
				coaches.map((coach) => coach.id),
				now,
			);
		const current = await ctx.db
			.query("developmentReviews")
			.withIndex("by_author_round", (q) =>
				q
					.eq("clubId", membership.clubId)
					.eq("personId", input.personId)
					.eq("round", round.round)
					.eq("coachId", membership.userId),
			)
			.unique();
		const next = developmentGuard(() =>
			nextDevelopmentReview(
				round,
				current ?? undefined,
				membership.userId,
				input,
				now,
			),
		);
		if (current) await ctx.db.patch(current._id, next);
		else
			await ctx.db.insert("developmentReviews", {
				clubId: membership.clubId,
				...next,
			});
		if (previousRound)
			await ctx.db.patch(previousRound._id, {
				revision: previousRound.revision + 1,
				updatedAt: now,
			});
		else
			await ctx.db.insert("developmentRounds", {
				clubId: membership.clubId,
				...round,
				revision: 1,
			});
	},
});

const versionArgs = {
	personId: v.string(),
	round: v.number(),
	revision: v.number(),
};

export const finalize = mutation({
	args: versionArgs,
	handler: async (ctx, expected): Promise<void> => {
		const membership = await requireCoach(ctx);
		const member = await playerMember(
			ctx,
			membership.clubId,
			expected.personId,
		);
		const round = await latestRound(ctx, membership.clubId, expected.personId);
		if (!round) throw new ConvexError("No review round to finalize.");
		developmentGuard(() => assertDevelopmentVersion(round, expected));
		const summary = await playerSummary(
			ctx,
			membership,
			member,
			await clubCoaches(ctx, membership.clubId),
		);
		const rating = developmentGuard(() => finalizedDevelopmentRating(summary));
		await writePlayerCoaching(ctx, membership.clubId, {
			...summary.profile,
			rating,
			ratingKnown: true,
		});
		await ctx.db.patch(round._id, {
			status: "finalized",
			finalizedRating: rating,
			finalizedAt: Date.now(),
			updatedAt: Date.now(),
			revision: round.revision + 1,
		});
	},
});

export const reopen = mutation({
	args: versionArgs,
	handler: async (ctx, expected): Promise<void> => {
		const membership = await requireCoach(ctx);
		const member = await playerMember(
			ctx,
			membership.clubId,
			expected.personId,
		);
		const round = await latestRound(ctx, membership.clubId, expected.personId);
		if (!round) throw new ConvexError("No review round to reopen.");
		developmentGuard(() => assertDevelopmentVersion(round, expected));
		const coaches = await clubCoaches(ctx, membership.clubId);
		const summary = await playerSummary(ctx, membership, member, coaches);
		developmentGuard(() => assertDevelopmentReopen(summary));
		const now = Date.now();
		if (round.status === "open")
			await ctx.db.patch(round._id, {
				status: "superseded",
				revision: round.revision + 1,
				updatedAt: now,
			});
		await ctx.db.insert("developmentRounds", {
			clubId: membership.clubId,
			...nextDevelopmentRound(
				expected.personId,
				round,
				summary.profile,
				coaches.map((coach) => coach.id),
				now,
			),
		});
	},
});
