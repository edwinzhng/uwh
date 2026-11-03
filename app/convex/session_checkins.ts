import { v } from "convex/values";
import { canManagePerson, canRegister } from "../src/domain/app-rules";
import type { ClubEvent } from "../src/domain/app-types";
import { practiceEvent } from "../src/domain/event-types";
import {
	type SessionCheckIn,
	validateSessionCheckIn,
} from "../src/domain/session-checkins";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { effectiveEventCoaches } from "./coaching_schedule";
import { accountFor, requireMember } from "./identity";

const eventFor = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	eventId: string,
): Promise<ClubEvent> => {
	const row = await ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", eventId),
		)
		.unique();
	if (!row || !practiceEvent(row.value)) throw new Error("Choose a practice.");
	return row.value;
};
const requireManagedPlayer = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	event: ClubEvent,
	personId: string,
): Promise<void> => {
	if (!canManagePerson(accountFor(actor), personId))
		throw new Error("This check-in is private.");
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", personId),
		)
		.unique();
	if (!person || !canRegister(person.value, event))
		throw new Error("This player is not eligible for the practice.");
};
export const state = query({
	args: { eventId: v.string() },
	handler: async (
		ctx,
		{ eventId },
	): Promise<{ canReview: boolean; entries: SessionCheckIn[] }> => {
		const actor = await requireMember(ctx);
		const event = await eventFor(ctx, actor, eventId);
		const assignments = actor.coachPrograms.length
			? (await effectiveEventCoaches(ctx, actor.clubId, event)).assignments
			: [];
		const canReview = assignments.some(
			(assignment) => assignment.coachId === actor.userId,
		);
		const rows = canReview
			? await ctx.db
					.query("sessionCheckins")
					.withIndex("by_event", (q) =>
						q.eq("clubId", actor.clubId).eq("eventId", eventId),
					)
					.collect()
			: (
					await Promise.all(
						[...new Set([actor.personId, ...actor.children])].map((personId) =>
							ctx.db
								.query("sessionCheckins")
								.withIndex("by_person_event", (q) =>
									q
										.eq("clubId", actor.clubId)
										.eq("personId", personId)
										.eq("eventId", eventId),
								)
								.unique(),
						),
					)
				).filter((row) => row !== null);
		return {
			canReview,
			entries: rows.map(({ personId, energy, note, updatedAt }) => ({
				eventId,
				personId,
				energy,
				note,
				updatedAt,
			})),
		};
	},
});
export const save = mutation({
	args: {
		eventId: v.string(),
		personId: v.string(),
		energy: v.number(),
		note: v.string(),
	},
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		const event = await eventFor(ctx, actor, args.eventId);
		await requireManagedPlayer(ctx, actor, event, args.personId);
		if (event.cancelled) throw new Error("This practice is cancelled.");
		const error = validateSessionCheckIn(args.energy, args.note);
		if (error) throw new Error(error);
		const existing = await ctx.db
			.query("sessionCheckins")
			.withIndex("by_person_event", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("personId", args.personId)
					.eq("eventId", args.eventId),
			)
			.unique();
		const value = {
			...args,
			clubId: actor.clubId,
			actorId: actor.userId,
			note: args.note.trim(),
			updatedAt: Date.now(),
		};
		if (existing) await ctx.db.patch(existing._id, value);
		else await ctx.db.insert("sessionCheckins", value);
	},
});
export const remove = mutation({
	args: { eventId: v.string(), personId: v.string() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		await eventFor(ctx, actor, args.eventId);
		if (!canManagePerson(accountFor(actor), args.personId))
			throw new Error("This check-in is private.");
		const row = await ctx.db
			.query("sessionCheckins")
			.withIndex("by_person_event", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("personId", args.personId)
					.eq("eventId", args.eventId),
			)
			.unique();
		if (row) await ctx.db.delete(row._id);
	},
});
