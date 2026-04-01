import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";

export const getPractices = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("practices")
			.withIndex("by_date")
			.order("desc")
			.collect();
	},
});

export const getUpcomingPractices = query({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const practices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.gte("date", now))
			.order("asc")
			.collect();

		return await Promise.all(
			practices.map(async (practice) => {
				const practiceCoaches = await ctx.db
					.query("practiceCoaches")
					.withIndex("by_practiceId", (q) => q.eq("practiceId", practice._id))
					.collect();

				const coachesWithNames = await Promise.all(
					practiceCoaches.map(async (pc) => {
						const coach = await ctx.db.get(pc.coachId);
						if (!coach) return { ...pc, coachName: "Unknown Coach" };
						const player = await ctx.db.get(coach.playerId);
						return {
							...pc,
							coachName: player?.fullName ?? "Unknown Coach",
						};
					}),
				);
				return {
					...practice,
					practiceCoaches: coachesWithNames,
				};
			}),
		);
	},
});

export const getPastPractices = query({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const practices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.lt("date", now))
			.order("desc")
			.collect();

		return await Promise.all(
			practices.map(async (practice) => {
				const practiceCoaches = await ctx.db
					.query("practiceCoaches")
					.withIndex("by_practiceId", (q) => q.eq("practiceId", practice._id))
					.collect();
				const coachesWithNames = await Promise.all(
					practiceCoaches.map(async (pc) => {
						const coach = await ctx.db.get(pc.coachId);
						if (!coach) return { ...pc, coachName: "Unknown Coach" };
						const player = await ctx.db.get(coach.playerId);
						return {
							...pc,
							coachName: player?.fullName ?? "Unknown Coach",
						};
					}),
				);
				return {
					...practice,
					practiceCoaches: coachesWithNames,
				};
			}),
		);
	},
});

export const getPracticeById = query({
	args: { id: v.id("practices") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getPracticeByUrlId = query({
	args: { idOrSporteasyId: v.string() },
	handler: async (ctx, args) => {
		const practiceId = ctx.db.normalizeId("practices", args.idOrSporteasyId);
		if (practiceId) {
			return await ctx.db.get(practiceId);
		}

		const sporteasyId = Number.parseInt(args.idOrSporteasyId, 10);
		if (!Number.isNaN(sporteasyId)) {
			return await ctx.db
				.query("practices")
				.withIndex("by_sporteasyId", (q) => q.eq("sporteasyId", sporteasyId))
				.unique();
		}

		return null;
	},
});

export const getPracticeDetails = query({
	args: { id: v.id("practices") },
	handler: async (ctx, args) => {
		const practice = await ctx.db.get(args.id);
		if (!practice) return null;

		return await getFullPracticeDetails(ctx, practice);
	},
});

export const getPracticeDetailsByUrlId = query({
	args: { idOrSporteasyId: v.string() },
	handler: async (ctx, args) => {
		const practiceId = ctx.db.normalizeId("practices", args.idOrSporteasyId);
		let practice: Doc<"practices"> | null = null;
		if (practiceId) {
			practice = await ctx.db.get(practiceId);
		} else {
			const sporteasyId = Number.parseInt(args.idOrSporteasyId, 10);
			if (!Number.isNaN(sporteasyId)) {
				practice = await ctx.db
					.query("practices")
					.withIndex("by_sporteasyId", (q) => q.eq("sporteasyId", sporteasyId))
					.unique();
			}
		}

		if (!practice) return null;
		return await getFullPracticeDetails(ctx, practice);
	},
});

async function getFullPracticeDetails(
	ctx: QueryCtx,
	practice: Doc<"practices">,
) {
	const practiceId = practice._id;
	// Get coaches
	const practiceCoaches = await ctx.db
		.query("practiceCoaches")
		.withIndex("by_practiceId", (q) => q.eq("practiceId", practiceId))
		.collect();

	const coachesWithDetails = await Promise.all(
		practiceCoaches.map(async (pc) => {
			const coach = await ctx.db.get(pc.coachId);
			if (!coach) return null;
			const player = await ctx.db.get(coach.playerId);
			return {
				...pc,
				coach: {
					...coach,
					player,
				},
			};
		}),
	);

	// Get player statuses
	const playerStatuses = await ctx.db
		.query("practicePlayerStatuses")
		.withIndex("by_practiceId", (q) => q.eq("practiceId", practiceId))
		.collect();

	const statusesWithPlayers = await Promise.all(
		playerStatuses.map(async (ps) => {
			const player = await ctx.db.get(ps.playerId);
			return {
				...ps,
				player,
			};
		}),
	);

	return {
		...practice,
		coaches: coachesWithDetails.filter(Boolean),
		playerStatuses: statusesWithPlayers,
	};
}

export const createPractice = mutation({
	args: {
		date: v.number(),
		notes: v.optional(v.string()),
		sporteasyId: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("practices", {
			date: args.date,
			notes: args.notes,
			sporteasyId: args.sporteasyId,
			updatedAt: now,
		});
	},
});

export const createPractices = mutation({
	args: {
		dates: v.array(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.dates.length === 0) throw new Error("No dates provided");
		const now = Date.now();
		const ids = await Promise.all(
			args.dates.map((date) =>
				ctx.db.insert("practices", {
					date,
					notes: args.notes,
					updatedAt: now,
				}),
			),
		);
		return ids;
	},
});

export const updatePractice = mutation({
	args: {
		id: v.id("practices"),
		date: v.optional(v.number()),
		notes: v.optional(v.string()),
		sporteasyId: v.optional(v.number()),
		discordReminderSentAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { id, ...updates } = args;

		// Clean undefined values
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined),
		);

		await ctx.db.patch(id, {
			...cleanUpdates,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(id);
	},
});

export const deletePractice = mutation({
	args: { id: v.id("practices") },
	handler: async (ctx, args) => {
		// Delete associated coaches
		const coaches = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
			.collect();
		for (const pc of coaches) {
			await ctx.db.delete(pc._id);
		}

		// Delete associated player statuses
		const statuses = await ctx.db
			.query("practicePlayerStatuses")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
			.collect();
		for (const ps of statuses) {
			await ctx.db.delete(ps._id);
		}

		// Delete associated attendance records
		const attendance = await ctx.db
			.query("practiceAttendance")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
			.collect();
		for (const a of attendance) {
			await ctx.db.delete(a._id);
		}

		// Finally delete the practice
		await ctx.db.delete(args.id);
		return { success: true };
	},
});

export const getUpcomingWeeklyPractices = internalQuery({
	args: {},
	handler: async (ctx: QueryCtx) => {
		const now = Date.now();
		const in48Hours = now + 48 * 60 * 60 * 1000;

		const allPractices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.gte("date", now).lte("date", in48Hours))
			.collect();

		return allPractices.filter((p) => {
			const isPractice =
				p.notes?.toLowerCase().includes("training") ||
				p.notes?.toLowerCase().includes("hockey") ||
				p.notes?.toLowerCase().includes("practice");
			return isPractice && !p.discordReminderSentAt;
		});
	},
});

export const setPlayerStatus = mutation({
	args: {
		practiceId: v.id("practices"),
		playerId: v.id("players"),
		statusType: v.union(
			v.literal("LAST_MINUTE_ADDITION"),
			v.literal("LAST_MINUTE_CANCELLATION"),
			v.literal("LATE"),
		),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practicePlayerStatuses")
			.withIndex("by_practiceId_and_playerId", (q) =>
				q.eq("practiceId", args.practiceId).eq("playerId", args.playerId),
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { statusType: args.statusType });
			return existing._id;
		} else {
			return await ctx.db.insert("practicePlayerStatuses", {
				practiceId: args.practiceId,
				playerId: args.playerId,
				statusType: args.statusType,
			});
		}
	},
});

export const removePlayerStatus = mutation({
	args: {
		practiceId: v.id("practices"),
		playerId: v.id("players"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practicePlayerStatuses")
			.withIndex("by_practiceId_and_playerId", (q) =>
				q.eq("practiceId", args.practiceId).eq("playerId", args.playerId),
			)
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
		return { success: true };
	},
});
