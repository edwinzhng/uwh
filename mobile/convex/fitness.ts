import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { validDate } from "../src/domain/app-rules";
import { parseFitnessValue } from "../src/domain/fitness";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { fitnessUnit } from "./fitness_schema";
import { requireMember } from "./identity";

const coach = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.coachPrograms.length) throw new Error("Coach access required.");
	return actor;
};
const testFor = async (
	ctx: QueryCtx,
	id: Id<"fitnessTests">,
): Promise<Doc<"fitnessTests">> => {
	const actor = await coach(ctx);
	const test = await ctx.db.get(id);
	if (!test || test.clubId !== actor.clubId) throw new Error("Test not found.");
	return test;
};
const sessionFor = async (
	ctx: QueryCtx,
	id: Id<"fitnessSessions">,
): Promise<{ session: Doc<"fitnessSessions">; test: Doc<"fitnessTests"> }> => {
	const actor = await coach(ctx);
	const session = await ctx.db.get(id);
	if (!session || session.clubId !== actor.clubId)
		throw new Error("Session not found.");
	return { session, test: await testFor(ctx, session.testId) };
};
const checkDate = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	seasonId: string,
	date: string,
): Promise<void> => {
	const club = await ctx.db.get(clubId);
	const season = (club?.seasons ?? initialSeasons).find(
		(entry) => entry.id === seasonId,
	);
	if (!validDate(date) || !season || date < season.start || date > season.end)
		throw new Error("Choose a date within the season.");
};
const checkRevision = (actual: number, expected: number): void => {
	if (actual !== expected)
		throw new Error("This record changed. Reopen it and try again.");
};
export const list = query({
	args: { archived: v.boolean(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		args,
	): Promise<PaginationResult<Doc<"fitnessTests">>> => {
		const actor = await coach(ctx);
		return ctx.db
			.query("fitnessTests")
			.withIndex("by_club_archive", (q) =>
				q.eq("clubId", actor.clubId).eq("archived", args.archived),
			)
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(30, args.paginationOpts.numItems),
			});
	},
});
export const test = query({
	args: { testId: v.id("fitnessTests") },
	handler: async (ctx, args): Promise<Doc<"fitnessTests">> =>
		testFor(ctx, args.testId),
});
export const saveTest = mutation({
	args: {
		testId: v.optional(v.id("fitnessTests")),
		revision: v.optional(v.number()),
		name: v.string(),
		unit: fitnessUnit,
	},
	handler: async (ctx, args): Promise<Id<"fitnessTests">> => {
		const actor = await coach(ctx);
		const name = args.name.trim();
		if (!name || name.length > 100)
			throw new Error("Enter a name under 100 characters.");
		if (!args.testId)
			return ctx.db.insert("fitnessTests", {
				clubId: actor.clubId,
				name,
				unit: args.unit,
				archived: false,
				revision: 0,
			});
		const test = await testFor(ctx, args.testId);
		checkRevision(test.revision, args.revision ?? -1);
		if (test.unit !== args.unit)
			throw new Error("Create a new test to use a different unit.");
		await ctx.db.patch(test._id, { name, revision: test.revision + 1 });
		return test._id;
	},
});
export const archiveTest = mutation({
	args: {
		testId: v.id("fitnessTests"),
		revision: v.number(),
		archived: v.boolean(),
	},
	handler: async (ctx, args): Promise<null> => {
		const test = await testFor(ctx, args.testId);
		checkRevision(test.revision, args.revision);
		await ctx.db.patch(test._id, {
			archived: args.archived,
			revision: test.revision + 1,
		});
		return null;
	},
});
export const sessions = query({
	args: {
		testId: v.id("fitnessTests"),
		seasonId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		args,
	): Promise<PaginationResult<Doc<"fitnessSessions">>> => {
		await testFor(ctx, args.testId);
		return ctx.db
			.query("fitnessSessions")
			.withIndex("by_test_season_date", (q) =>
				q.eq("testId", args.testId).eq("seasonId", args.seasonId),
			)
			.order("desc")
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(20, args.paginationOpts.numItems),
			});
	},
});
export const session = query({
	args: { sessionId: v.id("fitnessSessions") },
	handler: async (ctx, args): Promise<Doc<"fitnessSessions"> | null> => {
		const actor = await coach(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (session && session.clubId !== actor.clubId)
			throw new Error("Session not found.");
		return session;
	},
});
export const saveSession = mutation({
	args: {
		testId: v.id("fitnessTests"),
		sessionId: v.optional(v.id("fitnessSessions")),
		revision: v.optional(v.number()),
		seasonId: v.string(),
		date: v.string(),
		notes: v.string(),
	},
	handler: async (ctx, args): Promise<Id<"fitnessSessions">> => {
		const test = await testFor(ctx, args.testId);
		if (test.archived)
			throw new Error("Restore the test before editing sessions.");
		await checkDate(ctx, test.clubId, args.seasonId, args.date);
		if (args.notes.length > 2000)
			throw new Error("Keep notes under 2,000 characters.");
		const duplicate = await ctx.db
			.query("fitnessSessions")
			.withIndex("by_test_date", (q) =>
				q.eq("testId", test._id).eq("date", args.date),
			)
			.unique();
		if (duplicate && duplicate._id !== args.sessionId)
			throw new Error("A session already exists on this date.");
		if (!args.sessionId)
			return ctx.db.insert("fitnessSessions", {
				clubId: test.clubId,
				testId: test._id,
				seasonId: args.seasonId,
				date: args.date,
				notes: args.notes.trim(),
				revision: 0,
				resultCount: 0,
			});
		const { session } = await sessionFor(ctx, args.sessionId);
		if (session.testId !== test._id || session.seasonId !== args.seasonId)
			throw new Error("Session does not belong to this test and season.");
		checkRevision(session.revision, args.revision ?? -1);
		if (session.date !== args.date) {
			const results = await ctx.db
				.query("fitnessResults")
				.withIndex("by_session_person", (q) => q.eq("sessionId", session._id))
				.take(501);
			if (results.length > 500)
				throw new Error("Too many results to reschedule.");
			await Promise.all(
				results.map((result) => ctx.db.patch(result._id, { date: args.date })),
			);
		}
		await ctx.db.patch(session._id, {
			date: args.date,
			notes: args.notes.trim(),
			revision: session.revision + 1,
		});
		return session._id;
	},
});
type ResultRow = {
	personId: string;
	name: string;
	result: Doc<"fitnessResults"> | null;
	stats: Doc<"fitnessStats"> | null;
};
export const roster = query({
	args: {
		testId: v.id("fitnessTests"),
		seasonId: v.string(),
		sessionId: v.optional(v.id("fitnessSessions")),
		search: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args): Promise<PaginationResult<ResultRow>> => {
		const test = await testFor(ctx, args.testId);
		if (args.sessionId) {
			const session = await ctx.db.get(args.sessionId);
			if (!session) return { page: [], continueCursor: "", isDone: true };
			if (
				session.clubId !== test.clubId ||
				session.testId !== test._id ||
				session.seasonId !== args.seasonId
			)
				throw new Error("Session not found.");
		}
		const search = args.search.trim().slice(0, 100);
		const sessionId = args.sessionId;
		const page = await (search
			? ctx.db
					.query("members")
					.withSearchIndex("search_name", (q) =>
						q.search("value.name", search).eq("clubId", test.clubId),
					)
			: ctx.db
					.query("members")
					.withIndex("by_name", (q) => q.eq("clubId", test.clubId))
		).paginate({
			...args.paginationOpts,
			numItems: Math.min(25, args.paginationOpts.numItems),
		});
		return {
			...page,
			page: await Promise.all(
				page.page.map(
					async (member): Promise<ResultRow> => ({
						personId: member.value.id,
						name: member.value.name,
						result: sessionId
							? await ctx.db
									.query("fitnessResults")
									.withIndex("by_session_person", (q) =>
										q
											.eq("sessionId", sessionId)
											.eq("personId", member.value.id),
									)
									.unique()
							: null,
						stats: await ctx.db
							.query("fitnessStats")
							.withIndex("by_test_season_person", (q) =>
								q
									.eq("testId", test._id)
									.eq("seasonId", args.seasonId)
									.eq("personId", member.value.id),
							)
							.unique(),
					}),
				),
			),
		};
	},
});
const updateStats = async (
	ctx: MutationCtx,
	test: Doc<"fitnessTests">,
	session: Doc<"fitnessSessions">,
	personId: string,
	previous: number | undefined,
	next: number | undefined,
): Promise<void> => {
	const stats = await ctx.db
		.query("fitnessStats")
		.withIndex("by_test_season_person", (q) =>
			q
				.eq("testId", test._id)
				.eq("seasonId", session.seasonId)
				.eq("personId", personId),
		)
		.unique();
	const count =
		(stats?.count ?? 0) +
		(next === undefined ? 0 : 1) -
		(previous === undefined ? 0 : 1);
	if (!count) {
		if (stats) await ctx.db.delete(stats._id);
		return;
	}
	const best = await ctx.db
		.query("fitnessResults")
		.withIndex("by_person_value", (q) =>
			q
				.eq("testId", test._id)
				.eq("seasonId", session.seasonId)
				.eq("personId", personId),
		)
		.order(test.unit === "time" ? "asc" : "desc")
		.first();
	if (!best) throw new Error("Results changed. Try again.");
	const value = {
		clubId: test.clubId,
		testId: test._id,
		seasonId: session.seasonId,
		personId,
		count,
		total: (stats?.total ?? 0) + (next ?? 0) - (previous ?? 0),
		best: best.value,
	};
	if (stats) await ctx.db.patch(stats._id, value);
	else await ctx.db.insert("fitnessStats", value);
};
export const saveResults = mutation({
	args: {
		sessionId: v.id("fitnessSessions"),
		revision: v.number(),
		entries: v.array(
			v.object({ personId: v.string(), value: v.string(), notes: v.string() }),
		),
	},
	handler: async (ctx, args): Promise<number> => {
		const { test, session } = await sessionFor(ctx, args.sessionId);
		if (test.archived)
			throw new Error("Restore the test before editing results.");
		checkRevision(session.revision, args.revision);
		if (
			!args.entries.length ||
			args.entries.length > 25 ||
			new Set(args.entries.map((entry) => entry.personId)).size !==
				args.entries.length
		)
			throw new Error("Save up to 25 different players at a time.");
		const changes = await Promise.all(
			args.entries.map(async (entry) => {
				const person = await ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", test.clubId).eq("value.id", entry.personId),
					)
					.unique();
				if (!person) throw new Error("Player not found.");
				if (entry.notes.length > 1000)
					throw new Error("Keep player notes under 1,000 characters.");
				const value = parseFitnessValue(test.unit, entry.value);
				if (value === undefined && entry.notes.trim())
					throw new Error(
						"Enter a result for the note, or clear both to remove it.",
					);
				const existing = await ctx.db
					.query("fitnessResults")
					.withIndex("by_session_person", (q) =>
						q.eq("sessionId", session._id).eq("personId", entry.personId),
					)
					.unique();
				return { entry, value, existing };
			}),
		);
		const resultCount =
			session.resultCount +
			changes.reduce(
				(total, change) =>
					total +
					(change.value === undefined ? 0 : 1) -
					(change.existing ? 1 : 0),
				0,
			);
		if (resultCount > 500)
			throw new Error("A session supports up to 500 players.");
		for (const { entry, value, existing } of changes) {
			if (value === undefined) {
				if (existing) await ctx.db.delete(existing._id);
			} else if (existing)
				await ctx.db.patch(existing._id, { value, notes: entry.notes.trim() });
			else
				await ctx.db.insert("fitnessResults", {
					clubId: test.clubId,
					testId: test._id,
					sessionId: session._id,
					seasonId: session.seasonId,
					personId: entry.personId,
					date: session.date,
					value,
					notes: entry.notes.trim(),
				});
			await updateStats(
				ctx,
				test,
				session,
				entry.personId,
				existing?.value,
				value,
			);
		}
		const revision = session.revision + 1;
		await ctx.db.patch(session._id, { revision, resultCount });
		return revision;
	},
});
export const deleteSession = mutation({
	args: { sessionId: v.id("fitnessSessions"), revision: v.number() },
	handler: async (ctx, args): Promise<null> => {
		const { test, session } = await sessionFor(ctx, args.sessionId);
		checkRevision(session.revision, args.revision);
		const results = await ctx.db
			.query("fitnessResults")
			.withIndex("by_session_person", (q) => q.eq("sessionId", session._id))
			.take(501);
		if (results.length > 500) throw new Error("Too many results to delete.");
		for (const result of results) {
			await ctx.db.delete(result._id);
			await updateStats(
				ctx,
				test,
				session,
				result.personId,
				result.value,
				undefined,
			);
		}
		await ctx.db.delete(session._id);
		return null;
	},
});
export const trends = query({
	args: {
		testId: v.id("fitnessTests"),
		seasonId: v.string(),
		personIds: v.array(v.string()),
	},
	handler: async (
		ctx,
		args,
	): Promise<
		{
			id: string;
			label: string;
			points: { date: string; value: number }[];
			limited: boolean;
		}[]
	> => {
		const test = await testFor(ctx, args.testId);
		if (
			args.personIds.length > 4 ||
			new Set(args.personIds).size !== args.personIds.length
		)
			throw new Error("Compare up to four players.");
		return Promise.all(
			args.personIds.map(async (personId) => {
				const person = await ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", test.clubId).eq("value.id", personId),
					)
					.unique();
				if (!person) throw new Error("Player not found.");
				const results = await ctx.db
					.query("fitnessResults")
					.withIndex("by_person_date", (q) =>
						q
							.eq("testId", test._id)
							.eq("seasonId", args.seasonId)
							.eq("personId", personId),
					)
					.order("desc")
					.take(101);
				return {
					id: personId,
					label: person.value.name,
					points: results
						.slice(0, 100)
						.reverse()
						.map((result) => ({ date: result.date, value: result.value })),
					limited: results.length > 100,
				};
			}),
		);
	},
});
