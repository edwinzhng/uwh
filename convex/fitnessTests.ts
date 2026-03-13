import { v } from "convex/values";
import { fitnessTestUnits } from "../lib/fitness";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const fitnessTestUnitValidator = v.union(
	v.literal(fitnessTestUnits.TIME),
	v.literal(fitnessTestUnits.COUNT),
	v.literal(fitnessTestUnits.PASS_FAIL),
);

const normalizeName = (name: string): string => name.trim();

const getTimeValueInSeconds = (value: string): number => {
	const [minutes = "0", seconds = "0"] = value.split(":");
	return Number(minutes) * 60 + Number(seconds);
};

const formatAverageTimeValue = (totalSeconds: number): string => {
	const roundedTotalSeconds = Math.round(totalSeconds);
	const minutes = Math.floor(roundedTotalSeconds / 60);
	const seconds = `${roundedTotalSeconds % 60}`.padStart(2, "0");
	return `${minutes}:${seconds}`;
};

const formatValueForUnit = (
	unit: (typeof fitnessTestUnits)[keyof typeof fitnessTestUnits],
	value: number,
): string =>
	unit === fitnessTestUnits.TIME
		? formatAverageTimeValue(value)
		: Number.isInteger(value)
			? `${value}`
			: value.toFixed(1);

const isBetterResult = (
	unit: (typeof fitnessTestUnits)[keyof typeof fitnessTestUnits],
	candidate: string,
	currentBest: string | undefined,
): boolean => {
	if (currentBest === undefined) return true;
	if (unit === fitnessTestUnits.TIME) {
		return (
			getTimeValueInSeconds(candidate) < getTimeValueInSeconds(currentBest)
		);
	}
	if (unit === fitnessTestUnits.COUNT) {
		return Number(candidate) > Number(currentBest);
	}
	return candidate === "PASS" && currentBest !== "PASS";
};

export const getFitnessTests = query({
	args: {},
	handler: async (ctx) => {
		const tests = await ctx.db
			.query("fitnessTests")
			.withIndex("by_archivedAt_and_name", (q) => q.eq("archivedAt", undefined))
			.collect();

		return await Promise.all(
			tests.map(async (test) => {
				const latestSession = await ctx.db
					.query("fitnessTestSessions")
					.withIndex("by_fitnessTestId_and_date", (q) =>
						q.eq("fitnessTestId", test._id),
					)
					.order("desc")
					.first();

				if (!latestSession) {
					return {
						...test,
						latestSessionDate: undefined,
						latestSessionResultCount: 0,
					};
				}

				const latestResults = await ctx.db
					.query("fitnessTestResults")
					.withIndex("by_fitnessTestSessionId", (q) =>
						q.eq("fitnessTestSessionId", latestSession._id),
					)
					.collect();

				return {
					...test,
					latestSessionDate: latestSession.date,
					latestSessionResultCount: latestResults.length,
				};
			}),
		);
	},
});

export const getFitnessTestWorkspace = query({
	args: {
		fitnessTestId: v.id("fitnessTests"),
		sessionId: v.optional(v.id("fitnessTestSessions")),
	},
	handler: async (ctx, args) => {
		const fitnessTest = await ctx.db.get(args.fitnessTestId);
		if (!fitnessTest) return null;

		const allSessions = await ctx.db
			.query("fitnessTestSessions")
			.withIndex("by_fitnessTestId", (q) =>
				q.eq("fitnessTestId", args.fitnessTestId),
			)
			.collect();

		const sessionEntries = await Promise.all(
			allSessions.map(async (session) => ({
				results: await ctx.db
					.query("fitnessTestResults")
					.withIndex("by_fitnessTestSessionId", (q) =>
						q.eq("fitnessTestSessionId", session._id),
					)
					.collect(),
				session,
			})),
		);

		const allResults = sessionEntries.flatMap((entry) => entry.results);

		const selectedSessionEntry =
			args.sessionId === undefined
				? undefined
				: sessionEntries.find((entry) => entry.session._id === args.sessionId);

		if (args.sessionId !== undefined && !selectedSessionEntry) {
			throw new Error("Fitness test session not found");
		}

		const results = selectedSessionEntry?.results ?? [];

		const previousResultsByPlayerId = await Promise.all(
			results.map(async (result) => {
				const player = await ctx.db.get(result.playerId);
				return player
					? {
							playerId: result.playerId,
							playerName: player.fullName,
							value: result.value,
							notes: result.notes,
						}
					: null;
			}),
		);

		const bestResultsByPlayerIdMap = new Map<Id<"players">, string>();
		for (const result of allResults) {
			const currentBest = bestResultsByPlayerIdMap.get(result.playerId);
			if (!isBetterResult(fitnessTest.unit, result.value, currentBest)) {
				continue;
			}

			bestResultsByPlayerIdMap.set(result.playerId, result.value);
		}

		const bestResultsByPlayerId = Array.from(
			bestResultsByPlayerIdMap.entries(),
			([playerId, value]) => ({
				playerId,
				value,
			}),
		);

		const sessions = sessionEntries
			.map((entry) => ({
				_id: entry.session._id,
				date: entry.session.date,
				resultCount: entry.results.length,
			}))
			.sort((left, right) => right.date - left.date);

		const summaryCards = (() => {
			if (allResults.length === 0) {
				return fitnessTest.unit === fitnessTestUnits.PASS_FAIL
					? [
							{
								label: "% Passed",
								secondary: "Pending",
								value: "No results",
							},
						]
					: [
							{
								label:
									fitnessTest.unit === fitnessTestUnits.TIME
										? "Average Time"
										: "Average Count",
								secondary: "Pending",
								value: "No results",
							},
							{
								label: "Lowest",
								secondary: "Pending",
								value: "No results",
							},
							{
								label: "Highest",
								secondary: "Pending",
								value: "No results",
							},
						];
			}

			if (fitnessTest.unit === fitnessTestUnits.PASS_FAIL) {
				const passedCount = allResults.filter(
					(result) => result.value === "PASS",
				).length;
				const passedPercentage = Math.round(
					(passedCount / allResults.length) * 100,
				);

				return [
					{
						label: "% Passed",
						secondary: `${passedCount} of ${allResults.length} passed`,
						value: `${passedPercentage}%`,
					},
				];
			}

			const numericValues = allResults.map((result) =>
				fitnessTest.unit === fitnessTestUnits.TIME
					? getTimeValueInSeconds(result.value)
					: Number(result.value),
			);
			const average =
				numericValues.reduce((sum, value) => sum + value, 0) /
				numericValues.length;

			return [
				{
					label:
						fitnessTest.unit === fitnessTestUnits.TIME
							? "Average Time"
							: "Average Count",
					secondary: `${allResults.length} recorded results`,
					value: formatValueForUnit(fitnessTest.unit, average),
				},
				{
					label: "Lowest",
					secondary: `${allResults.length} recorded results`,
					value: formatValueForUnit(
						fitnessTest.unit,
						Math.min(...numericValues),
					),
				},
				{
					label: "Highest",
					secondary: `${allResults.length} recorded results`,
					value: formatValueForUnit(
						fitnessTest.unit,
						Math.max(...numericValues),
					),
				},
			];
		})();

		return {
			bestResults: bestResultsByPlayerId,
			fitnessTest,
			results: previousResultsByPlayerId.filter(
				(
					result,
				): result is {
					playerId: Id<"players">;
					playerName: string;
					value: string;
					notes: string | undefined;
				} => result !== null,
			),
			selectedSession:
				selectedSessionEntry === undefined
					? undefined
					: {
							_id: selectedSessionEntry.session._id,
							date: selectedSessionEntry.session.date,
							resultCount: selectedSessionEntry.results.length,
						},
			sessions,
			summaryCards,
		};
	},
});

export const createFitnessTest = mutation({
	args: {
		name: v.string(),
		unit: fitnessTestUnitValidator,
	},
	handler: async (ctx, args) => {
		const name = normalizeName(args.name);
		if (!name) {
			throw new Error("Name is required");
		}

		return await ctx.db.insert("fitnessTests", {
			name,
			unit: args.unit,
			updatedAt: Date.now(),
		});
	},
});

export const updateFitnessTest = mutation({
	args: {
		id: v.id("fitnessTests"),
		name: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Fitness test not found");
		}

		const updates = {
			name: args.name === undefined ? undefined : normalizeName(args.name),
			updatedAt: Date.now(),
		};

		if (updates.name !== undefined && !updates.name) {
			throw new Error("Name is required");
		}

		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([, value]) => value !== undefined),
		);

		await ctx.db.patch(args.id, cleanUpdates);
		return await ctx.db.get(args.id);
	},
});

export const archiveFitnessTest = mutation({
	args: {
		id: v.id("fitnessTests"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Fitness test not found");
		}

		await ctx.db.patch(args.id, {
			archivedAt: Date.now(),
			updatedAt: Date.now(),
		});
		return { success: true };
	},
});

export const saveFitnessTestSession = mutation({
	args: {
		sessionId: v.id("fitnessTestSessions"),
		entries: v.array(
			v.object({
				playerId: v.id("players"),
				value: v.string(),
				notes: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Fitness test session not found");
		}

		const cleanedEntries = args.entries
			.map((entry) => ({
				playerId: entry.playerId,
				value: entry.value.trim(),
				notes: entry.notes?.trim() || undefined,
			}))
			.filter((entry) => entry.value);

		if (cleanedEntries.length === 0) {
			const existingResults = await ctx.db
				.query("fitnessTestResults")
				.withIndex("by_fitnessTestSessionId", (q) =>
					q.eq("fitnessTestSessionId", session._id),
				)
				.collect();

			await Promise.all(
				existingResults.map(async (result) => {
					await ctx.db.delete(result._id);
				}),
			);

			await ctx.db.patch(session._id, {
				updatedAt: Date.now(),
			});
			return session._id;
		}

		const now = Date.now();
		await ctx.db.patch(session._id, {
			updatedAt: now,
		});
		await ctx.db.patch(session.fitnessTestId, {
			updatedAt: now,
		});

		const existingResults = await ctx.db
			.query("fitnessTestResults")
			.withIndex("by_fitnessTestSessionId", (q) =>
				q.eq("fitnessTestSessionId", session._id),
			)
			.collect();

		const existingResultsByPlayerId = new Map(
			existingResults.map((result) => [result.playerId, result]),
		);
		const incomingPlayerIds = new Set(
			cleanedEntries.map((entry) => entry.playerId),
		);

		await Promise.all(
			existingResults
				.filter((result) => !incomingPlayerIds.has(result.playerId))
				.map(async (result) => {
					await ctx.db.delete(result._id);
				}),
		);

		await Promise.all(
			cleanedEntries.map(async (entry) => {
				const existingResult = existingResultsByPlayerId.get(entry.playerId);
				if (existingResult) {
					await ctx.db.patch(existingResult._id, {
						value: entry.value,
						notes: entry.notes,
						updatedAt: now,
					});
					return;
				}

				await ctx.db.insert("fitnessTestResults", {
					fitnessTestSessionId: session._id,
					playerId: entry.playerId,
					value: entry.value,
					notes: entry.notes,
					updatedAt: now,
				});
			}),
		);

		return session._id;
	},
});

export const createFitnessTestSession = mutation({
	args: {
		date: v.number(),
		fitnessTestId: v.id("fitnessTests"),
	},
	handler: async (ctx, args) => {
		const fitnessTest = await ctx.db.get(args.fitnessTestId);
		if (!fitnessTest) {
			throw new Error("Fitness test not found");
		}

		const existingSession = await ctx.db
			.query("fitnessTestSessions")
			.withIndex("by_fitnessTestId_and_date", (q) =>
				q.eq("fitnessTestId", args.fitnessTestId).eq("date", args.date),
			)
			.unique();
		if (existingSession) {
			throw new Error("A session already exists for that date");
		}

		const now = Date.now();
		const sessionId = await ctx.db.insert("fitnessTestSessions", {
			date: args.date,
			fitnessTestId: args.fitnessTestId,
			updatedAt: now,
		});

		await ctx.db.patch(args.fitnessTestId, {
			updatedAt: now,
		});

		return sessionId;
	},
});

export const updateFitnessTestSession = mutation({
	args: {
		date: v.number(),
		sessionId: v.id("fitnessTestSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Fitness test session not found");
		}

		const existingSession = await ctx.db
			.query("fitnessTestSessions")
			.withIndex("by_fitnessTestId_and_date", (q) =>
				q.eq("fitnessTestId", session.fitnessTestId).eq("date", args.date),
			)
			.unique();
		if (existingSession && existingSession._id !== session._id) {
			throw new Error("A session already exists for that date");
		}

		await ctx.db.patch(session._id, {
			date: args.date,
			updatedAt: Date.now(),
		});

		return session._id;
	},
});

export const deleteFitnessTestSession = mutation({
	args: {
		sessionId: v.id("fitnessTestSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Fitness test session not found");
		}

		const results = await ctx.db
			.query("fitnessTestResults")
			.withIndex("by_fitnessTestSessionId", (q) =>
				q.eq("fitnessTestSessionId", session._id),
			)
			.collect();

		await Promise.all(
			results.map(async (result) => {
				await ctx.db.delete(result._id);
			}),
		);

		await ctx.db.delete(session._id);
		await ctx.db.patch(session.fitnessTestId, {
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
