import { v } from "convex/values";
import { fitnessTestUnits, normalizeFitnessResultValue } from "../lib/fitness";
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

const formatSummaryPeople = (
	names: string[],
): { secondary: string; secondaryTitle?: string } => {
	if (names.length === 0) {
		return { secondary: "Pending" };
	}

	if (names.length === 1) {
		return {
			secondary: names[0],
			secondaryTitle: names[0],
		};
	}

	return {
		secondary: `${names[0]} +${names.length - 1}`,
		secondaryTitle: names.join(", "),
	};
};

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

const getTimeValueInSecondsForOverview = (value: string): number => {
	const [minutes = "0", seconds = "0"] = value.split(":");
	return Number(minutes) * 60 + Number(seconds);
};

const formatAverageTimeValueForOverview = (totalSeconds: number): string => {
	const roundedTotalSeconds = Math.round(totalSeconds);
	const minutes = Math.floor(roundedTotalSeconds / 60);
	const seconds = `${roundedTotalSeconds % 60}`.padStart(2, "0");
	return `${minutes}:${seconds}`;
};

const formatValueForOverview = (
	unit: (typeof fitnessTestUnits)[keyof typeof fitnessTestUnits],
	value: number,
): string =>
	unit === fitnessTestUnits.TIME
		? formatAverageTimeValueForOverview(value)
		: Number.isInteger(value)
			? `${value}`
			: value.toFixed(1);

export const getFitnessOverview = query({
	args: {
		sessionDate: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tests = await ctx.db
			.query("fitnessTests")
			.withIndex("by_archivedAt_and_name", (q) => q.eq("archivedAt", undefined))
			.collect();

		const players = await ctx.db.query("players").collect();
		const playerNameById = new Map(
			players.map((player) => [player._id, player.fullName]),
		);

		const allResults = await ctx.db.query("fitnessTestResults").collect();

		const testStats = await Promise.all(
			tests.map(async (test) => {
				const allSessions = await ctx.db
					.query("fitnessTestSessions")
					.withIndex("by_fitnessTestId", (q) => q.eq("fitnessTestId", test._id))
					.collect();

				// When filtering by date, only include sessions on that date
				const filteredSessions =
					args.sessionDate !== undefined
						? allSessions.filter((s) => s.date === args.sessionDate)
						: allSessions;

				const sessionIds = filteredSessions.map((s) => s._id);

				const testResults = allResults.filter((r) =>
					sessionIds.includes(r.fitnessTestSessionId),
				);

				const playerIds = [...new Set(testResults.map((r) => r.playerId))];

				const playerStats = playerIds
					.map((playerId) => {
						const playerResults = testResults.filter(
							(r) => r.playerId === playerId,
						);
						const playerName = playerNameById.get(playerId);
						if (!playerName) return undefined;

						// When filtering by session date, show actual value (not best)
						if (args.sessionDate !== undefined) {
							const result = playerResults[0];
							if (!result) return undefined;
							return {
								playerId,
								playerName,
								best: result.value,
								average: "",
								resultCount: 1,
							};
						}

						if (test.unit === fitnessTestUnits.PASS_FAIL) {
							const passCount = playerResults.filter(
								(r) => r.value === "PASS",
							).length;
							const passRate = Math.round(
								(passCount / playerResults.length) * 100,
							);
							const bestValue = passCount > 0 ? "PASS" : "FAIL";
							return {
								playerId,
								playerName,
								best: bestValue,
								average: `${passRate}% pass`,
								resultCount: playerResults.length,
							};
						}

						const numericValues = playerResults.map((r) =>
							test.unit === fitnessTestUnits.TIME
								? getTimeValueInSecondsForOverview(r.value)
								: Number(r.value),
						);

						const average =
							numericValues.reduce((sum, v) => sum + v, 0) /
							numericValues.length;

						const bestNumeric =
							test.unit === fitnessTestUnits.TIME
								? Math.min(...numericValues)
								: Math.max(...numericValues);

						return {
							playerId,
							playerName,
							best: formatValueForOverview(test.unit, bestNumeric),
							average: formatValueForOverview(test.unit, average),
							resultCount: playerResults.length,
						};
					})
					.filter((s): s is NonNullable<typeof s> => s !== undefined);

				const rankedStats = [...playerStats].sort((a, b) => {
					if (test.unit === fitnessTestUnits.TIME) {
						return (
							getTimeValueInSecondsForOverview(a.best) -
							getTimeValueInSecondsForOverview(b.best)
						);
					}
					if (test.unit === fitnessTestUnits.COUNT) {
						return Number(b.best) - Number(a.best);
					}
					return a.playerName.localeCompare(b.playerName);
				});

				return {
					test,
					playerStats: rankedStats,
				};
			}),
		);

		return testStats;
	},
});

export const getFitnessTestSessionDates = query({
	args: {},
	handler: async (ctx) => {
		const sessions = await ctx.db.query("fitnessTestSessions").collect();
		// Get unique dates sorted descending
		const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort(
			(a, b) => b - a,
		);
		return uniqueDates;
	},
});

export const getPlayerFitnessHistory = query({
	args: { playerId: v.id("players") },
	handler: async (ctx, args) => {
		const player = await ctx.db.get(args.playerId);
		if (!player) return null;

		// Get all results for this player
		const results = await ctx.db
			.query("fitnessTestResults")
			.withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
			.collect();

		// Get all sessions referenced
		const sessionIds = [...new Set(results.map((r) => r.fitnessTestSessionId))];
		const sessions = (
			await Promise.all(sessionIds.map((id) => ctx.db.get(id)))
		).filter((s): s is NonNullable<typeof s> => s !== null);

		const sessionMap = new Map(sessions.map((s) => [s._id, s]));

		// Get unique test IDs from sessions
		const testIdSet = new Set(sessions.map((s) => s.fitnessTestId));
		const tests = (
			await Promise.all([...testIdSet].map((id) => ctx.db.get(id)))
		).filter((t): t is NonNullable<typeof t> => t !== null);

		const activeTests = tests.filter((t) => !t.archivedAt);

		const mappedResults = results
			.map((r) => {
				const session = sessionMap.get(r.fitnessTestSessionId);
				if (!session) return null;
				return {
					_id: r._id,
					sessionId: r.fitnessTestSessionId,
					testId: session.fitnessTestId,
					value: r.value,
					date: session.date,
				};
			})
			.filter((r): r is NonNullable<typeof r> => r !== null)
			.sort((a, b) => a.date - b.date);

		return {
			player: { _id: player._id, fullName: player.fullName },
			tests: activeTests,
			results: mappedResults,
		};
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

		const playerIds = [...new Set(allResults.map((result) => result.playerId))];
		const playerNameById = new Map(
			(
				await Promise.all(
					playerIds.map(async (playerId) => {
						const player = await ctx.db.get(playerId);
						return player ? [playerId, player.fullName] : undefined;
					}),
				)
			).filter(
				(entry): entry is [Id<"players">, string] => entry !== undefined,
			),
		);

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
			const lowestValue = Math.min(...numericValues);
			const highestValue = Math.max(...numericValues);
			const lowestNames = [
				...new Set(
					allResults
						.filter((result) => {
							const numericValue =
								fitnessTest.unit === fitnessTestUnits.TIME
									? getTimeValueInSeconds(result.value)
									: Number(result.value);
							return numericValue === lowestValue;
						})
						.map((result) => playerNameById.get(result.playerId))
						.filter((name): name is string => name !== undefined),
				),
			];
			const highestNames = [
				...new Set(
					allResults
						.filter((result) => {
							const numericValue =
								fitnessTest.unit === fitnessTestUnits.TIME
									? getTimeValueInSeconds(result.value)
									: Number(result.value);
							return numericValue === highestValue;
						})
						.map((result) => playerNameById.get(result.playerId))
						.filter((name): name is string => name !== undefined),
				),
			];
			const lowestSummary = formatSummaryPeople(lowestNames);
			const highestSummary = formatSummaryPeople(highestNames);

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
					secondary: lowestSummary.secondary,
					secondaryTitle: lowestSummary.secondaryTitle,
					value: formatValueForUnit(fitnessTest.unit, lowestValue),
				},
				{
					label: "Highest",
					secondary: highestSummary.secondary,
					secondaryTitle: highestSummary.secondaryTitle,
					value: formatValueForUnit(fitnessTest.unit, highestValue),
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

		const fitnessTest = await ctx.db.get(session.fitnessTestId);
		if (!fitnessTest) {
			throw new Error("Fitness test not found");
		}

		const cleanedEntries = args.entries
			.map((entry) => ({
				playerId: entry.playerId,
				value: normalizeFitnessResultValue(fitnessTest.unit, entry.value),
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
