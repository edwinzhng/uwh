import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { canReadProgress } from "../src/domain/app-rules";
import { migratedGoalReflection } from "../src/domain/goal-reflection-migration";
import {
	type GoalReflection,
	reflectionMatches,
	validateGoalReflection,
} from "../src/domain/goal-reflections";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { enqueue } from "./notifications";

const personFor = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<Doc<"members">> => {
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", personId),
		)
		.unique();
	if (!person) throw new ConvexError("Player unavailable.");
	return person;
};

export const list = query({
	args: { personId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ personId, paginationOpts },
	): Promise<PaginationResult<GoalReflection>> => {
		const membership = await requireMember(ctx);
		const person = await personFor(ctx, membership.clubId, personId);
		if (!canReadProgress(accountFor(membership), person.value))
			throw new ConvexError("These goal reflections are private.");
		const page = await ctx.db
			.query("goalReflections")
			.withIndex("by_club_person_date", (q) =>
				q.eq("clubId", membership.clubId).eq("personId", personId),
			)
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(40, Math.max(1, paginationOpts.numItems)),
				maximumRowsRead: 40,
			});
		return {
			...page,
			page: page.page.map((entry) => ({
				id: entry._id,
				personId: entry.personId,
				goal: entry.goal,
				goalDetails: entry.goalDetails,
				goalRevision: entry.goalRevision,
				note: entry.note,
				selfRating: entry.selfRating,
				createdAt: entry.createdAt,
				checkIn: entry.checkIn,
			})),
		};
	},
});

export const record = mutation({
	args: {
		goalRevision: v.optional(v.number()),
		personId: v.string(),
		requestId: v.string(),
		goal: v.string(),
		expectedSteps: v.number(),
		note: v.string(),
		selfRating: v.number(),
	},
	handler: async (ctx, input): Promise<void> => {
		const membership = await requireMember(ctx);
		if (membership.personId !== input.personId)
			throw new ConvexError("Only the player can record their own reflection.");
		if (input.requestId.length < 16 || input.requestId.length > 100)
			throw new ConvexError("Reopen the check-in and try again.");
		const previous = await ctx.db
			.query("goalReflections")
			.withIndex("by_request", (q) =>
				q
					.eq("clubId", membership.clubId)
					.eq("authorId", membership.userId)
					.eq("requestId", input.requestId),
			)
			.unique();
		if (previous) {
			if (
				!reflectionMatches(previous, input) ||
				previous.personId !== input.personId
			)
				throw new ConvexError(
					"This check-in was already recorded. Reopen to record another.",
				);
			return;
		}
		const error = validateGoalReflection(input);
		if (error) throw new ConvexError(error);
		const person = await personFor(ctx, membership.clubId, input.personId);
		if (person.value.archived)
			throw new ConvexError("Archived players cannot add check-ins.");
		if (
			person.value.goal !== input.goal ||
			(input.goalRevision !== undefined &&
				input.goalRevision !== (person.value.goalRevision ?? 0))
		)
			throw new ConvexError(
				"Your goal changed. Reopen the check-in to review the current goal.",
			);
		if (person.value.steps !== input.expectedSteps)
			throw new ConvexError(
				"Your check-in count changed. Review the current progress and try again.",
			);
		const checkIn = Math.min(6, person.value.steps + 1);
		const reflectionId = await ctx.db.insert("goalReflections", {
			clubId: membership.clubId,
			personId: input.personId,
			authorId: membership.userId,
			requestId: input.requestId,
			goal: input.goal,
			goalDetails: person.value.goalDetails,
			goalRevision: person.value.goalRevision ?? 0,
			note: input.note.trim(),
			selfRating: input.selfRating,
			createdAt: Date.now(),
			checkIn,
		});
		const [source, club] = await Promise.all([
			ctx.db.get(reflectionId),
			ctx.db.get(membership.clubId),
		]);
		if (!source || !club) throw new ConvexError("Reflection unavailable.");
		await ctx.db.insert(
			"sessionPerformance",
			migratedGoalReflection(
				{ ...source, id: source._id },
				club.timeZone ?? "America/Edmonton",
				person.value.name,
			),
		);
		await ctx.db.patch(person._id, {
			value: { ...person.value, steps: checkIn },
		});
		await enqueue(ctx, {
			clubId: membership.clubId,
			actorId: membership.userId,
			kind: "feedback",
			topic: "progress",
			entityId: person._id,
			key: `${membership.clubId}:reflection:${membership.userId}:${input.requestId}`,
		});
	},
});
