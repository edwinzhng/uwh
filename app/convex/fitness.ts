import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { canReadProgress, validDate } from "../src/domain/app-rules";
import type { ClubEvent, Member } from "../src/domain/app-types";
import { canRegister } from "../src/domain/event-eligibility";
import { clubDate } from "../src/domain/event-time";
import { practiceEvent } from "../src/domain/event-types";
import { fitnessLowerIsBetter, parseFitnessValue } from "../src/domain/fitness";
import { fitnessDivision } from "../src/domain/fitness-division";
import {
	fitnessEntriesError,
	fitnessTestNameError,
} from "../src/domain/fitness-model";
import { markedHereForFitness } from "../src/domain/fitness-quick-log";
import { rankFitnessResults } from "../src/domain/fitness-ranking";
import type { HomeFitnessSnapshot } from "../src/domain/home-summary";
import type { PersonalFitnessRow } from "../src/domain/personal-fitness";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { fitnessUnit } from "./fitness_schema";
import { accountFor, requireMember } from "./identity";

const coach = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.coachPrograms.length) throw new Error("Coach access required.");
	return actor;
};

export const homeSummary = query({
	args: { personId: v.string(), today: v.string() },
	handler: async (
		ctx,
		{ personId },
	): Promise<{ result?: HomeFitnessSnapshot }> => {
		const actor = await requireMember(ctx);
		const [person, club] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", personId),
				)
				.unique(),
			ctx.db.get(actor.clubId),
		]);
		if (!person || !canReadProgress(accountFor(actor), person.value))
			throw new Error("These fitness results are private.");
		const latest = await ctx.db
			.query("fitnessResults")
			.withIndex("by_club_person_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("personId", personId)
					.lte("date", clubDate(undefined, club?.timeZone)),
			)
			.order("desc")
			.first();
		if (!latest) return {};
		const [test, history, stats] = await Promise.all([
			ctx.db.get(latest.testId),
			ctx.db
				.query("fitnessResults")
				.withIndex("by_person_date", (q) =>
					q
						.eq("testId", latest.testId)
						.eq("seasonId", latest.seasonId)
						.eq("personId", personId)
						.lte("date", latest.date),
				)
				.order("desc")
				.take(2),
			ctx.db
				.query("fitnessStats")
				.withIndex("by_test_season_person", (q) =>
					q
						.eq("testId", latest.testId)
						.eq("seasonId", latest.seasonId)
						.eq("personId", personId),
				)
				.unique(),
		]);
		if (!test || test.clubId !== actor.clubId) return {};
		return {
			result: {
				seasonId: latest.seasonId,
				row: {
					test: {
						_id: test._id,
						name: test.name,
						unit: test.unit,
						lowerIsBetter: test.lowerIsBetter,
						archived: test.archived,
						revision: test.revision,
					},
					history: history.map(({ sessionId, date, value, notes }) => ({
						sessionId,
						date,
						value,
						notes,
					})),
					stats: stats
						? { count: stats.count, total: stats.total, best: stats.best }
						: undefined,
					limited: (stats?.count ?? history.length) > 2,
				},
			},
		};
	},
});
export const logContext = query({
	args: { date: v.string(), eventId: v.optional(v.string()) },
	handler: async (
		ctx,
		args,
	): Promise<{
		practices: ClubEvent[];
		members: Member[];
		limited: boolean;
	}> => {
		const actor = await coach(ctx);
		if (!validDate(args.date)) throw new Error("Choose a valid date.");
		const [groups, members, selected] = await Promise.all([
			Promise.all(
				(["training", "hockey", "program"] as const).flatMap((kind) => [
					ctx.db
						.query("events")
						.withIndex("by_club_kind_date", (q) =>
							q
								.eq("clubId", actor.clubId)
								.eq("value.kind", kind)
								.lte("value.date", args.date),
						)
						.order("desc")
						.take(30),
					ctx.db
						.query("events")
						.withIndex("by_club_kind_date", (q) =>
							q
								.eq("clubId", actor.clubId)
								.eq("value.kind", kind)
								.gt("value.date", args.date),
						)
						.take(10),
				]),
			),
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.take(501),
			args.eventId
				? ctx.db
						.query("events")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", actor.clubId).eq("value.id", args.eventId ?? ""),
						)
						.unique()
				: undefined,
		]);
		const practices = [
			...new Map(
				[...groups.flat(), ...(selected ? [selected] : [])].map((row) => [
					row.value.id,
					row.value,
				]),
			).values(),
		].filter((event) => practiceEvent(event) && !event.cancelled);
		return {
			practices,
			members: members.slice(0, 500).map((row) => row.value),
			limited: members.length > 500,
		};
	},
});

export const quickLogRoster = query({
	args: { eventId: v.string(), testId: v.id("fitnessTests") },
	handler: async (
		ctx,
		{ eventId, testId },
	): Promise<{
		presentIds: string[];
		recordedIds: string[];
	}> => {
		const test = await testFor(ctx, testId);
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", test.clubId).eq("value.id", eventId),
			)
			.unique();
		if (
			!event ||
			event.value.cancelled ||
			!practiceEvent(event.value) ||
			test.archived
		)
			return { presentIds: [], recordedIds: [] };
		const [responses, session] = await Promise.all([
			ctx.db
				.query("responses")
				.withIndex("by_event", (q) =>
					q.eq("clubId", test.clubId).eq("value.eventId", eventId),
				)
				.collect(),
			ctx.db
				.query("fitnessSessions")
				.withIndex("by_test_date", (q) =>
					q.eq("testId", testId).eq("date", event.value.date),
				)
				.unique(),
		]);
		const results =
			session && (!session.eventId || session.eventId === eventId)
				? await ctx.db
						.query("fitnessResults")
						.withIndex("by_session_person", (q) =>
							q.eq("sessionId", session._id),
						)
						.take(500)
				: [];
		return {
			presentIds: responses
				.filter(({ value }) => markedHereForFitness(event.value, value))
				.map(({ value }) => value.personId),
			recordedIds: results.map((result) => result.personId),
		};
	},
});

export const personalHistory = query({
	args: {
		testId: v.id("fitnessTests"),
		personId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ testId, personId, paginationOpts },
	): Promise<PaginationResult<PersonalFitnessRow["history"][number]>> => {
		const actor = await requireMember(ctx);
		const [test, member] = await Promise.all([
			ctx.db.get(testId),
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", personId),
				)
				.unique(),
		]);
		if (
			!test ||
			test.clubId !== actor.clubId ||
			!member ||
			!canReadProgress(accountFor(actor), member.value)
		)
			throw new Error("These fitness results are private.");
		const page = await ctx.db
			.query("fitnessResults")
			.withIndex("by_test_person_date", (q) =>
				q.eq("testId", testId).eq("personId", personId),
			)
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(25, paginationOpts.numItems),
				maximumRowsRead: 100,
			});
		return {
			...page,
			page: page.page.map(({ sessionId, date, value, notes }) => ({
				sessionId,
				date,
				value,
				notes,
			})),
		};
	},
});

export const personal = query({
	args: {
		personId: v.string(),
		seasonId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args): Promise<PaginationResult<PersonalFitnessRow>> => {
		const actor = await requireMember(ctx);
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", args.personId),
			)
			.unique();
		if (!member || !canReadProgress(accountFor(actor), member.value))
			throw new Error("These fitness results are private.");
		const tests = await ctx.db
			.query("fitnessTests")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(8, Math.max(1, args.paginationOpts.numItems)),
				maximumRowsRead: 8,
			});
		const rows = await Promise.all(
			tests.page.map(async (test): Promise<PersonalFitnessRow> => {
				const seasonId = args.seasonId;
				const [history, summaries] = await Promise.all([
					(seasonId
						? ctx.db
								.query("fitnessResults")
								.withIndex("by_person_date", (q) =>
									q
										.eq("testId", test._id)
										.eq("seasonId", seasonId)
										.eq("personId", args.personId),
								)
						: ctx.db
								.query("fitnessResults")
								.withIndex("by_test_person_date", (q) =>
									q.eq("testId", test._id).eq("personId", args.personId),
								)
					)
						.order("desc")
						.take(101),
					(seasonId
						? ctx.db
								.query("fitnessStats")
								.withIndex("by_test_season_person", (q) =>
									q
										.eq("testId", test._id)
										.eq("seasonId", seasonId)
										.eq("personId", args.personId),
								)
						: ctx.db
								.query("fitnessStats")
								.withIndex("by_test_person", (q) =>
									q.eq("testId", test._id).eq("personId", args.personId),
								)
					).collect(),
				]);
				const stats = summaries.length
					? {
							count: summaries.reduce((total, entry) => total + entry.count, 0),
							total: summaries.reduce((total, entry) => total + entry.total, 0),
							best: summaries.reduce(
								(best, entry) =>
									fitnessLowerIsBetter(test)
										? Math.min(best, entry.best)
										: Math.max(best, entry.best),
								summaries.at(0)?.best ?? 0,
							),
						}
					: undefined;
				return {
					test: {
						_id: test._id,
						name: test.name,
						unit: test.unit,
						lowerIsBetter: test.lowerIsBetter,
						archived: test.archived,
						revision: test.revision,
					},
					history: history
						.slice(0, 100)
						.map(({ sessionId, date, value, notes }) => ({
							sessionId,
							date,
							value,
							notes,
						})),
					stats: stats
						? { count: stats.count, total: stats.total, best: stats.best }
						: undefined,
					limited: history.length > 100,
				};
			}),
		);
		return { ...tests, page: rows.filter((row) => row.history.length > 0) };
	},
});
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
		lowerIsBetter: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<Id<"fitnessTests">> => {
		const actor = await coach(ctx);
		const name = args.name.trim();
		const nameError = fitnessTestNameError(name);
		if (nameError) throw new Error(nameError);
		if (!args.testId)
			return ctx.db.insert("fitnessTests", {
				clubId: actor.clubId,
				name,
				unit: args.unit,
				lowerIsBetter: fitnessLowerIsBetter(args),
				archived: false,
				revision: 0,
			});
		const test = await testFor(ctx, args.testId);
		checkRevision(test.revision, args.revision ?? -1);
		if (test.unit !== args.unit)
			throw new Error("Create a new test to use a different unit.");
		if (
			args.lowerIsBetter !== undefined &&
			fitnessLowerIsBetter(test) !== args.lowerIsBetter
		)
			throw new Error("Create a new test to change the scoring direction.");
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
			throw new Error("Keep notes to 2,000 characters");
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
		if (session.eventId && session.date !== args.date)
			throw new Error("Practice-linked results keep the practice date.");
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
		.order(fitnessLowerIsBetter(test) ? "asc" : "desc")
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
export const logResult = mutation({
	args: {
		testId: v.id("fitnessTests"),
		eventId: v.string(),
		personId: v.string(),
		value: v.string(),
		notes: v.string(),
		operationKey: v.string(),
	},
	handler: async (ctx, args): Promise<null> => {
		const test = await testFor(ctx, args.testId);
		if (test.archived) throw new Error("Choose an active test.");
		if (!args.operationKey || args.operationKey.length > 100)
			throw new Error("Invalid operation key.");
		const [event, person, club] = await Promise.all([
			ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", test.clubId).eq("value.id", args.eventId),
				)
				.unique(),
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", test.clubId).eq("value.id", args.personId),
				)
				.unique(),
			ctx.db.get(test.clubId),
		]);
		if (
			!event ||
			!practiceEvent(event.value) ||
			event.value.cancelled ||
			!person ||
			!canRegister(person.value, event.value)
		)
			throw new Error("Choose a practice and an eligible player.");
		const entryError = fitnessEntriesError(test.unit, [args]);
		if (entryError) throw new Error(entryError);
		const value = parseFitnessValue(test.unit, args.value);
		if (value === undefined) throw new Error("Add a result.");
		const season = (club?.seasons ?? initialSeasons).find(
			(entry) =>
				event.value.date >= entry.start && event.value.date <= entry.end,
		);
		if (!season) throw new Error("Choose a practice within a season.");
		const previous = await ctx.db
			.query("fitnessSessions")
			.withIndex("by_test_date", (q) =>
				q.eq("testId", test._id).eq("date", event.value.date),
			)
			.unique();
		if (previous?.eventId && previous.eventId !== event.value.id)
			throw new Error(
				"This test already has results for another practice on this date.",
			);
		const sessionId =
			previous?._id ??
			(await ctx.db.insert("fitnessSessions", {
				clubId: test.clubId,
				testId: test._id,
				seasonId: season.id,
				date: event.value.date,
				notes: "",
				revision: 0,
				resultCount: 0,
				eventId: event.value.id,
				programId: event.value.program,
			}));
		const session = await ctx.db.get(sessionId);
		if (!session || session.seasonId !== season.id)
			throw new Error("Session not found for this season.");
		const existing = await ctx.db
			.query("fitnessResults")
			.withIndex("by_session_person", (q) =>
				q.eq("sessionId", sessionId).eq("personId", args.personId),
			)
			.unique();
		if (existing) {
			if (
				existing.operationKey === args.operationKey &&
				existing.value === value &&
				existing.notes === args.notes.trim()
			)
				return null;
			throw new Error(
				"A result is already recorded. Open the test to edit it.",
			);
		}
		const response = await ctx.db
			.query("responses")
			.withIndex("by_club_and_key", (q) =>
				q
					.eq("clubId", test.clubId)
					.eq("value.id", `${args.eventId}:${args.personId}`),
			)
			.unique();
		if (!markedHereForFitness(event.value, response?.value))
			throw new Error("Mark this player Here before logging a swim result.");
		if (session.resultCount >= 500)
			throw new Error("A session supports up to 500 players.");
		await ctx.db.insert("fitnessResults", {
			clubId: test.clubId,
			testId: test._id,
			sessionId,
			seasonId: season.id,
			personId: args.personId,
			date: event.value.date,
			value,
			notes: args.notes.trim(),
			operationKey: args.operationKey,
		});
		await updateStats(ctx, test, session, args.personId, undefined, value);
		await ctx.db.patch(sessionId, {
			revision: session.revision + 1,
			resultCount: session.resultCount + 1,
			eventId: event.value.id,
			programId: event.value.program,
		});
		return null;
	},
});
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
		const entryError = fitnessEntriesError(test.unit, args.entries);
		if (entryError) throw new Error(entryError);
		const changes = await Promise.all(
			args.entries.map(async (entry) => {
				const person = await ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", test.clubId).eq("value.id", entry.personId),
					)
					.unique();
				if (!person) throw new Error("Player not found.");
				if (person.value.mergedInto)
					throw new Error(
						"This profile was merged. Reopen the current roster.",
					);
				const value = parseFitnessValue(test.unit, entry.value);
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

export const competition = query({
	args: { personId: v.string(), seasonId: v.string() },
	handler: async (
		ctx,
		{ personId, seasonId },
	): Promise<{
		division?: string;
		rows: {
			testId: string;
			name: string;
			unit: "time" | "distance" | "count" | "pass_fail";
			overallBest?: number;
			divisionBest?: number;
			personalBest?: number;
			overallRank?: number;
			divisionRank?: number;
		}[];
	}> => {
		const actor = await requireMember(ctx);
		const [person, club, members, profiles, coaching, tests] =
			await Promise.all([
				ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", actor.clubId).eq("value.id", personId),
					)
					.unique(),
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
				ctx.db
					.query("fitnessTests")
					.withIndex("by_club_archive", (q) =>
						q.eq("clubId", actor.clubId).eq("archived", false),
					)
					.take(101),
			]);
		if (!person || !canReadProgress(accountFor(actor), person.value))
			throw new Error("These fitness results are private.");
		const season = (club?.seasons ?? initialSeasons).find(
			(entry) => entry.id === seasonId,
		);
		if (!season) throw new Error("Season not found.");
		if (
			members.length > 500 ||
			profiles.length > 500 ||
			coaching.length > 500 ||
			tests.length > 100
		)
			throw new Error("Fitness competition is unavailable for this club size.");
		const active = new Set(
			members
				.filter(({ value }) => !value.archived && !value.mergedInto)
				.map(({ value }) => value.id),
		);
		const genders = new Map(
			coaching.map((entry) => [entry.personId, entry.gender]),
		);
		const divisions = new Map(
			profiles.map((profile) => [
				profile.personId,
				fitnessDivision(
					profile.birthDate,
					profile.competitionGender ?? genders.get(profile.personId),
					season.start,
				),
			]),
		);
		const division = divisions.get(personId);
		const rows = await Promise.all(
			tests.map(async (test) => {
				const stats = await ctx.db
					.query("fitnessStats")
					.withIndex("by_test_person", (q) => q.eq("testId", test._id))
					.take(2001);
				if (stats.length > 2000)
					throw new Error(
						"Fitness competition is unavailable for this club size.",
					);
				const scores = stats
					.filter((entry) => active.has(entry.personId))
					.map((entry) => ({ personId: entry.personId, value: entry.best }));
				const overall = rankFitnessResults(test, scores);
				const group = division
					? rankFitnessResults(
							test,
							scores.filter(
								(entry) => divisions.get(entry.personId) === division,
							),
						)
					: [];
				return {
					testId: test._id,
					name: test.name,
					unit: test.unit,
					overallBest: overall.at(0)?.value,
					divisionBest: group.at(0)?.value,
					personalBest: overall.find((entry) => entry.personId === personId)
						?.value,
					overallRank: overall.find((entry) => entry.personId === personId)
						?.rank,
					divisionRank: group.find((entry) => entry.personId === personId)
						?.rank,
				};
			}),
		);
		return {
			division,
			rows: rows.filter(
				(row) => row.unit !== "pass_fail" && row.overallBest !== undefined,
			),
		};
	},
});
