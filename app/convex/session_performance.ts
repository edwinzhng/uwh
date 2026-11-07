import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	canEditSessionPerformance,
	canReadSessionPerformance,
	canReportSessionPerformance,
	canWriteSessionPerformance,
	nextSessionPerformance,
	type PerformanceSession,
	performanceSession,
	performanceSessionEligible,
	type SessionPerformance,
	type SessionPerformanceEntry,
	sessionPerformanceAuthorKey,
	sessionPerformancePayload,
} from "../src/domain/session-performance";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { sessionPerformanceKind } from "./session_performance_schema";

const personFor = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	personId: string,
): Promise<Doc<"members">> => {
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", personId),
		)
		.unique();
	if (!person || !canReadSessionPerformance(accountFor(actor), person.value))
		throw new Error(
			"These session ratings are private to the player, linked guardians and coaches.",
		);
	return person;
};
const projectEntry = (row: Doc<"sessionPerformance">): SessionPerformance => ({
	id: row._id,
	personId: row.personId,
	eventId: row.eventId,
	sessionNumber: row.sessionNumber,
	eventTitle: row.eventTitle,
	eventDate: row.eventDate,
	dateKind: row.dateKind,
	programId: row.programId,
	kind: row.kind,
	authorId: row.authorId,
	authorName: row.authorName,
	rating: row.rating,
	comments: row.comments,
	revision: row.revision,
	updatedAt: row.updatedAt,
	removed: row.removed,
});
const eventFor = (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	eventId: string,
): Promise<Doc<"events"> | null> =>
	ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", eventId),
		)
		.unique();
export const page = query({
	args: {
		personId: v.string(),
		kind: v.optional(sessionPerformanceKind),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ personId, kind, paginationOpts },
	): Promise<PaginationResult<SessionPerformanceEntry>> => {
		const actor = await requireMember(ctx);
		const person = await personFor(ctx, actor, personId);
		if (
			kind &&
			!canReadSessionPerformance(accountFor(actor), person.value, kind)
		)
			throw new Error("Coach access required.");
		const visibleKind = canReadSessionPerformance(
			accountFor(actor),
			person.value,
			"coach",
		)
			? kind
			: "self";
		const records = visibleKind
			? ctx.db
					.query("sessionPerformance")
					.withIndex("by_person_kind", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("personId", personId)
							.eq("kind", visibleKind),
					)
			: ctx.db
					.query("sessionPerformance")
					.withIndex("by_person", (q) =>
						q.eq("clubId", actor.clubId).eq("personId", personId),
					);
		const page = await records
			.filter((q) => q.neq(q.field("removed"), true))
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(30, Math.max(1, paginationOpts.numItems)),
				maximumRowsRead: 100,
			});
		return {
			...page,
			page: await Promise.all(
				page.page.map(async (row): Promise<SessionPerformanceEntry> => {
					const event = await eventFor(ctx, actor.clubId, row.eventId);
					const entry = projectEntry(row);
					return {
						...entry,
						canEdit: canEditSessionPerformance(
							accountFor(actor),
							person.value,
							event?.value,
							entry,
						),
						canReport: canReportSessionPerformance(
							accountFor(actor),
							person.value,
							entry,
						),
					};
				}),
			),
		};
	},
});
export const current = query({
	args: {
		personId: v.string(),
		eventId: v.string(),
		kind: sessionPerformanceKind,
	},
	handler: async (
		ctx,
		{ personId, eventId, kind },
	): Promise<SessionPerformanceEntry | null> => {
		const actor = await requireMember(ctx);
		const person = await personFor(ctx, actor, personId);
		if (!canReadSessionPerformance(accountFor(actor), person.value, kind))
			throw new Error("Coach access required.");
		const row = await ctx.db
			.query("sessionPerformance")
			.withIndex("by_identity", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("personId", personId)
					.eq("eventId", eventId)
					.eq("kind", kind)
					.eq("authorKey", sessionPerformanceAuthorKey(kind, actor.userId)),
			)
			.unique();
		if (!row) return null;
		const entry = projectEntry(row);
		const event = await eventFor(ctx, actor.clubId, eventId);
		return {
			...entry,
			canEdit: canEditSessionPerformance(
				accountFor(actor),
				person.value,
				event?.value,
				entry,
			),
			canReport: canReportSessionPerformance(
				accountFor(actor),
				person.value,
				entry,
			),
		};
	},
});
export const sessions = query({
	args: { personId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ personId, paginationOpts },
	): Promise<PaginationResult<PerformanceSession>> => {
		const actor = await requireMember(ctx);
		const person = await personFor(ctx, actor, personId);
		const page = await ctx.db
			.query("events")
			.withIndex("by_date", (q) => q.eq("clubId", actor.clubId))
			.filter((q) =>
				q.and(
					q.eq(q.field("value.cancelled"), false),
					q.or(
						q.eq(q.field("value.kind"), "hockey"),
						q.eq(q.field("value.kind"), "training"),
						q.eq(q.field("value.kind"), "program"),
					),
				),
			)
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(30, Math.max(1, paginationOpts.numItems)),
				maximumRowsRead: 100,
			});
		return {
			...page,
			page: page.page
				.filter((row) => performanceSessionEligible(person.value, row.value))
				.map((row) => performanceSession(row.value)),
		};
	},
});
export const save = mutation({
	args: {
		personId: v.string(),
		eventId: v.string(),
		kind: sessionPerformanceKind,
		rating: v.number(),
		comments: v.string(),
		revision: v.number(),
		requestId: v.string(),
	},
	handler: async (ctx, input): Promise<string> => {
		const actor = await requireMember(ctx);
		const person = await personFor(ctx, actor, input.personId);
		const account = accountFor(actor);
		if (!canWriteSessionPerformance(account, person.value, input.kind))
			throw new Error(
				input.kind === "coach"
					? "Coach access required."
					: "Only this player or a linked guardian can record their self-rating.",
			);
		const event = await eventFor(ctx, actor.clubId, input.eventId);
		if (!event || !performanceSessionEligible(person.value, event.value))
			throw new Error("Choose a current, eligible practice for this player.");
		if (input.requestId.length < 16 || input.requestId.length > 128)
			throw new Error("Reopen the rating and retry.");
		const payload = sessionPerformancePayload(input);
		const previous = await ctx.db
			.query("sessionPerformanceRequests")
			.withIndex("by_request", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("actorId", actor.userId)
					.eq("requestId", input.requestId),
			)
			.unique();
		if (previous) {
			if (previous.payload !== payload)
				throw new Error(
					"This request was already used for another session rating.",
				);
			return previous.entryId;
		}
		const authorKey = sessionPerformanceAuthorKey(input.kind, actor.userId);
		const row = await ctx.db
			.query("sessionPerformance")
			.withIndex("by_identity", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("personId", input.personId)
					.eq("eventId", input.eventId)
					.eq("kind", input.kind)
					.eq("authorKey", authorKey),
			)
			.unique();
		if (row?.removed)
			throw new Error(
				"This feedback was removed by a club administrator and cannot be replaced.",
			);
		const next = nextSessionPerformance(
			row ? projectEntry(row) : undefined,
			input,
			account,
			event.value,
			"",
			Date.now(),
		);
		const values = {
			clubId: actor.clubId,
			personId: next.personId,
			eventId: next.eventId,
			sessionNumber: next.sessionNumber,
			eventTitle: next.eventTitle,
			eventDate: next.eventDate,
			programId: next.programId,
			kind: next.kind,
			authorKey,
			authorId: actor.userId,
			authorName: next.authorName,
			rating: next.rating,
			comments: next.comments,
			revision: next.revision,
			updatedAt: next.updatedAt,
		};
		const id = row?._id ?? (await ctx.db.insert("sessionPerformance", values));
		if (row) await ctx.db.patch(row._id, values);
		await ctx.db.insert("sessionPerformanceRequests", {
			clubId: actor.clubId,
			actorId: actor.userId,
			personId: input.personId,
			requestId: input.requestId,
			payload,
			entryId: id,
		});
		return id;
	},
});
