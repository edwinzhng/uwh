import { v } from "convex/values";
import { canRegister, validDate } from "../src/domain/app-rules";
import type { ClubEvent } from "../src/domain/app-types";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import {
	type SessionSeries,
	seriesHasSpace,
	syncSeriesResponses,
} from "../src/domain/session-series";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";

const seriesFor = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	id: string,
): Promise<Doc<"sessionSeries">> => {
	const series = await ctx.db
		.query("sessionSeries")
		.withIndex("by_key", (q) => q.eq("clubId", clubId).eq("id", id))
		.unique();
	if (!series) throw new Error("Session series not found.");
	return series;
};
const eventsFor = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	seriesIds: string[],
): Promise<ClubEvent[]> =>
	(
		await Promise.all(
			seriesIds.map((seriesId) =>
				ctx.db
					.query("events")
					.withIndex("by_series", (q) =>
						q.eq("clubId", clubId).eq("value.seriesId", seriesId),
					)
					.collect(),
			),
		)
	)
		.flat()
		.map((row) => row.value)
		.toSorted((a, b) => a.date.localeCompare(b.date));
export const synchronizeSeries = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	series: SessionSeries,
): Promise<void> => {
	const events = await eventsFor(ctx, clubId, series.seriesIds);
	const rows = (
		await Promise.all(
			events.map((event) =>
				ctx.db
					.query("responses")
					.withIndex("by_event", (q) =>
						q.eq("clubId", clubId).eq("value.eventId", event.id),
					)
					.collect(),
			),
		)
	).flat();
	const club = await ctx.db.get(clubId);
	const next = syncSeriesResponses(
		series,
		events,
		rows.map((row) => row.value),
		clubDate(undefined, club?.timeZone),
		Date.now(),
	);
	for (const response of next) {
		const row = rows.find(
			(row) =>
				row.value.eventId === response.eventId &&
				row.value.personId === response.personId,
		);
		const value = {
			...response,
			id: row?.value.id ?? `${response.eventId}:${response.personId}`,
		};
		if (row) {
			if (JSON.stringify(row.value) !== JSON.stringify(value))
				await ctx.db.patch(row._id, { value });
		} else await ctx.db.insert("responses", { clubId, value });
	}
};
export const syncEditedSeries = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	before: ClubEvent[],
	after: ClubEvent[],
): Promise<void> => {
	const series = await ctx.db
		.query("sessionSeries")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect();
	for (const entry of series) {
		const previous = before.filter(
			(event) => event.seriesId && entry.seriesIds.includes(event.seriesId),
		);
		if (!previous.length) continue;
		const addedIds = after
			.filter((event) => previous.some((old) => old.id === event.id))
			.flatMap((event) => (event.seriesId ? [event.seriesId] : []));
		const updated = {
			...entry,
			seriesIds: [...new Set([...entry.seriesIds, ...addedIds])],
		};
		await ctx.db.patch(entry._id, { seriesIds: updated.seriesIds });
		await synchronizeSeries(ctx, clubId, updated);
	}
};
export const list = query({
	args: {},
	handler: async (ctx): Promise<SessionSeries[]> => {
		const actor = await requireMember(ctx);
		const series = await ctx.db
			.query("sessionSeries")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		return series.map(
			({ id, seriesIds, title, capacity, waitlist, enrollments }) => ({
				id,
				seriesIds,
				title,
				capacity,
				waitlist,
				enrollments,
			}),
		);
	},
});
export const detail = query({
	args: { seriesId: v.string() },
	handler: async (
		ctx,
		{ seriesId },
	): Promise<{ series: SessionSeries; events: ClubEvent[] }> => {
		const actor = await requireMember(ctx);
		const series = await seriesFor(ctx, actor.clubId, seriesId);
		return {
			series: {
				id: series.id,
				seriesIds: series.seriesIds,
				title: series.title,
				capacity: series.capacity,
				waitlist: series.waitlist,
				enrollments: series.enrollments,
			},
			events: await eventsFor(ctx, actor.clubId, series.seriesIds),
		};
	},
});
export const configure = mutation({
	args: {
		seriesId: v.string(),
		title: v.string(),
		capacity: v.optional(v.number()),
		waitlist: v.boolean(),
	},
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		if (!args.title.trim() || args.title.length > 100)
			throw new Error("Enter a series title under 100 characters.");
		if (
			args.capacity !== undefined &&
			(!Number.isInteger(args.capacity) ||
				args.capacity < 1 ||
				args.capacity > 500)
		)
			throw new Error("Choose a capacity of 1–500.");
		const existing = await ctx.db
			.query("sessionSeries")
			.withIndex("by_key", (q) =>
				q.eq("clubId", actor.clubId).eq("id", args.seriesId),
			)
			.unique();
		const events = await eventsFor(
			ctx,
			actor.clubId,
			existing?.seriesIds ?? [args.seriesId],
		);
		if (!events.length) throw new Error("Create a recurring event first.");
		const series: SessionSeries = {
			...args,
			id: args.seriesId,
			seriesIds: existing?.seriesIds ?? [args.seriesId],
			enrollments: existing?.enrollments ?? [],
		};
		if (
			series.enrollments.some(
				(entry) =>
					entry.state === "committed" &&
					!seriesHasSpace(series, entry.start, entry.end, entry.personId),
			)
		)
			throw new Error("Capacity cannot be smaller than the committed roster.");
		const value = {
			clubId: actor.clubId,
			id: series.id,
			title: args.title.trim(),
			seriesIds: series.seriesIds,
			capacity: args.capacity,
			waitlist: args.waitlist,
			enrollments: series.enrollments,
		};
		if (existing) await ctx.db.patch(existing._id, value);
		else await ctx.db.insert("sessionSeries", value);
		await synchronizeSeries(ctx, actor.clubId, series);
	},
});
export const enroll = mutation({
	args: {
		seriesId: v.string(),
		personId: v.string(),
		start: v.string(),
		end: v.optional(v.string()),
		promote: v.optional(v.boolean()),
		invite: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (
			!(
				actor.admin ||
				actor.personId === args.personId ||
				actor.children.includes(args.personId)
			)
		)
			throw new Error("You cannot manage this player.");
		if (args.invite && !actor.admin)
			throw new Error("Administrator access required.");
		const series = await seriesFor(ctx, actor.clubId, args.seriesId);
		const events = await eventsFor(ctx, actor.clubId, series.seriesIds);
		const club = await ctx.db.get(actor.clubId);
		const today = clubDate(undefined, club?.timeZone);
		if (
			!validDate(args.start) ||
			args.start < today ||
			!events.some((event) => event.date >= args.start && !event.cancelled) ||
			(args.end !== undefined &&
				(!validDate(args.end) || args.end <= args.start))
		)
			throw new Error(
				"Choose a current or future start date within this series.",
			);
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (
			!person ||
			events.some(
				(event) =>
					event.date >= args.start &&
					(!args.end || event.date < args.end) &&
					!event.cancelled &&
					!canRegister(person.value, event),
			)
		)
			throw new Error("This player is not eligible for the series.");
		const current = series.enrollments.find(
			(entry) =>
				entry.personId === args.personId && (!entry.end || entry.end > today),
		);
		if (current?.state === "committed")
			throw new Error(
				"This player is already committed. End the existing commitment first.",
			);
		if (current?.state === "waiting" && !(actor.admin && args.promote))
			throw new Error("This player is already on the series waitlist.");
		const space = seriesHasSpace(series, args.start, args.end, args.personId);
		if (!args.invite && !space && (!series.waitlist || args.promote))
			throw new Error("The committed roster is full.");
		const enrollment = {
			personId: args.personId,
			start: args.start,
			end: args.end,
			state: args.invite
				? ("invited" as const)
				: space
					? ("committed" as const)
					: ("waiting" as const),
		};
		const enrollments = [
			...series.enrollments.filter((entry) => entry !== current),
			enrollment,
		];
		if (enrollment.state === "committed") {
			for (const event of events.filter(
				(event) =>
					!event.cancelled &&
					event.date >= args.start &&
					(!args.end || event.date < args.end),
			)) {
				const responses = await ctx.db
					.query("responses")
					.withIndex("by_event", (q) =>
						q.eq("clubId", actor.clubId).eq("value.eventId", event.id),
					)
					.collect();
				const occupied = responses.filter(
					(row) =>
						row.value.personId !== args.personId &&
						(row.value.response === "going" || row.value.seriesExpected),
				).length;
				if (occupied >= (event.capacity ?? Infinity))
					throw new Error(
						"A session is full. Adjust its guest registrations or capacity before enrolling this player.",
					);
			}
		}
		await ctx.db.patch(series._id, { enrollments });
		await synchronizeSeries(ctx, actor.clubId, { ...series, enrollments });
	},
});
export const end = mutation({
	args: { seriesId: v.string(), personId: v.string(), date: v.string() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (
			!(
				actor.admin ||
				actor.personId === args.personId ||
				actor.children.includes(args.personId)
			)
		)
			throw new Error("You cannot manage this player.");
		const series = await seriesFor(ctx, actor.clubId, args.seriesId);
		const club = await ctx.db.get(actor.clubId);
		if (
			!validDate(args.date) ||
			args.date < clubDate(undefined, club?.timeZone)
		)
			throw new Error("Choose today or a future date.");
		const enrollments = series.enrollments.map((entry) =>
			entry.personId === args.personId && (!entry.end || entry.end > args.date)
				? { ...entry, end: args.date }
				: entry,
		);
		await ctx.db.patch(series._id, { enrollments });
		await synchronizeSeries(ctx, actor.clubId, { ...series, enrollments });
	},
});
export const absence = mutation({
	args: { eventId: v.string(), personId: v.string(), unavailable: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (
			!(
				actor.admin ||
				actor.personId === args.personId ||
				actor.children.includes(args.personId)
			)
		)
			throw new Error("You cannot manage this player.");
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.eventId),
			)
			.unique();
		const row = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) =>
				q.eq("clubId", actor.clubId).eq("value.eventId", args.eventId),
			)
			.filter((q) => q.eq(q.field("value.personId"), args.personId))
			.unique();
		const club = await ctx.db.get(actor.clubId);
		if (
			!event ||
			event.value.cancelled ||
			clubTimestamp(
				event.value.date,
				event.value.end,
				event.value.timeZone ?? club?.timeZone,
			) <= Date.now() ||
			!row?.value.seriesExpected
		)
			throw new Error("No current series commitment for this session.");
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (!person || !canRegister(person.value, event.value))
			throw new Error("This player is no longer eligible for this session.");
		await ctx.db.patch(row._id, {
			value: {
				...row.value,
				response: args.unavailable ? "unavailable" : "going",
				partIds: undefined,
			},
		});
	},
});

export const guest = mutation({
	args: { eventId: v.string(), personId: v.string(), attending: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.eventId),
			)
			.unique();
		if (
			!event ||
			!event.value.seriesId ||
			event.value.cancelled ||
			clubTimestamp(event.value.date, event.value.end, event.value.timeZone) <=
				Date.now()
		)
			throw new Error("Choose an upcoming series session.");
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (!person || !canRegister(person.value, event.value))
			throw new Error("Choose an eligible player.");
		const rows = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) =>
				q.eq("clubId", actor.clubId).eq("value.eventId", args.eventId),
			)
			.collect();
		const current = rows.find((row) => row.value.personId === args.personId);
		if (current?.value.seriesExpected)
			throw new Error(
				"This player has a term commitment. Manage their session absence instead.",
			);
		const occupied = rows.filter(
			(row) =>
				row.value.personId !== args.personId &&
				(row.value.seriesExpected || row.value.response === "going"),
		).length;
		if (args.attending && occupied >= (event.value.capacity ?? Infinity))
			throw new Error(
				"No unreserved places. Increase this session’s capacity before adding a guest.",
			);
		const value = {
			...current?.value,
			id: current?.value.id ?? `${args.eventId}:${args.personId}`,
			eventId: args.eventId,
			personId: args.personId,
			response: args.attending ? ("going" as const) : ("unavailable" as const),
			attendance: current?.value.attendance ?? ("unmarked" as const),
			partIds: undefined,
		};
		if (current) await ctx.db.patch(current._id, { value });
		else await ctx.db.insert("responses", { clubId: actor.clubId, value });
	},
});
