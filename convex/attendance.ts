import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getPracticeAttendance = query({
	args: { practiceId: v.id("practices") },
	handler: async (ctx, args) => {
		const records = await ctx.db
			.query("practiceAttendance")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
			.collect();

		return await Promise.all(
			records.map(async (r) => {
				const player = await ctx.db.get(r.playerId);
				return { ...r, player };
			}),
		);
	},
});

/** Returns every practice (past) with attendance counts, and every player with
 *  their per-practice attended flag — for the stats grid page. */
export const getAttendanceOverview = query({
	args: {
		seasonStart: v.optional(v.number()),
		seasonEnd: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const rangeEnd = Math.min(args.seasonEnd ?? now, now);

		// All past practices in the season range, ordered oldest first
		const practices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) =>
				q.gte("date", args.seasonStart ?? 0).lt("date", rangeEnd),
			)
			.order("asc")
			.collect();

		// Deduplicate by calendar date — pick the earliest practice per day
		const practicesByDate = new Map<string, (typeof practices)[0]>();
		for (const p of practices) {
			const dateKey = new Date(p.date).toISOString().split("T")[0];
			if (!practicesByDate.has(dateKey)) {
				practicesByDate.set(dateKey, p);
			}
		}
		const canonicalPractices = [...practicesByDate.values()];

		// All players
		const players = await ctx.db.query("players").collect();

		// All attendance records for canonical practices
		const canonicalIds = new Set(canonicalPractices.map((p) => p._id));
		const allAttendance = await Promise.all(
			[...canonicalIds].map((pid) =>
				ctx.db
					.query("practiceAttendance")
					.withIndex("by_practiceId", (q) => q.eq("practiceId", pid))
					.collect(),
			),
		);
		const attendanceMap = new Map<string, boolean>();
		for (const records of allAttendance) {
			for (const r of records) {
				attendanceMap.set(`${r.practiceId}:${r.playerId}`, r.attended);
			}
		}

		return {
			practices: canonicalPractices,
			players: players.map((p) => ({
				...p,
				attendance: canonicalPractices.map((practice) => ({
					practiceId: practice._id,
					attended: attendanceMap.get(`${practice._id}:${p._id}`) ?? null,
				})),
			})),
		};
	},
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const upsertAttendance = mutation({
	args: {
		practiceId: v.id("practices"),
		playerId: v.id("players"),
		attended: v.boolean(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practiceAttendance")
			.withIndex("by_practiceId_and_playerId", (q) =>
				q.eq("practiceId", args.practiceId).eq("playerId", args.playerId),
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				attended: args.attended,
				source: "manual",
				updatedAt: Date.now(),
			});
			return existing._id;
		}

		return await ctx.db.insert("practiceAttendance", {
			practiceId: args.practiceId,
			playerId: args.playerId,
			attended: args.attended,
			source: "manual",
			updatedAt: Date.now(),
		});
	},
});

export const internalUpsertAttendance = internalMutation({
	args: {
		practiceId: v.id("practices"),
		playerId: v.id("players"),
		attended: v.boolean(),
		source: v.union(v.literal("manual"), v.literal("sporteasy")),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practiceAttendance")
			.withIndex("by_practiceId_and_playerId", (q) =>
				q.eq("practiceId", args.practiceId).eq("playerId", args.playerId),
			)
			.unique();

		if (existing) {
			// Don't overwrite manual entries with sporteasy data
			if (existing.source === "manual" && args.source === "sporteasy") {
				return existing._id;
			}
			await ctx.db.patch(existing._id, {
				attended: args.attended,
				source: args.source,
				updatedAt: Date.now(),
			});
			return existing._id;
		}

		return await ctx.db.insert("practiceAttendance", {
			practiceId: args.practiceId,
			playerId: args.playerId,
			attended: args.attended,
			source: args.source,
			updatedAt: Date.now(),
		});
	},
});

// ---------------------------------------------------------------------------
// Internal queries for sync actions
// ---------------------------------------------------------------------------

export const internalGetPastSporteasyPractices = internalQuery({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const practices = await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.lt("date", now))
			.collect();
		return practices.filter((p) => p.sporteasyId != null);
	},
});

export const internalGetPracticesByDate = internalQuery({
	args: { dateKey: v.string() },
	handler: async (ctx, args) => {
		// dateKey = "YYYY-MM-DD"
		const start = new Date(args.dateKey).getTime();
		const end = start + 24 * 60 * 60 * 1000;
		return await ctx.db
			.query("practices")
			.withIndex("by_date", (q) => q.gte("date", start).lt("date", end))
			.collect();
	},
});

// ---------------------------------------------------------------------------
// Sync actions
// ---------------------------------------------------------------------------

const SPORTEASY_V2_1_BASE_URL = "https://api.sporteasy.net/v2.1";
const SPORTEASY_TEAM_ID = process.env.SPORTEASY_TEAM_ID || "2307567";
const SPORTEASY_SEASON_ID = process.env.SPORTEASY_SEASON_ID || "2633771";

interface SportEasyEvent {
	id: number;
	name: string;
	start_at: string;
	is_cancelled?: boolean;
}

interface SportEasyEventDetail {
	attendees: Array<{
		attendance_status: string;
		results: Array<{ profile: { id: number } }>;
	}>;
}

async function fetchWithCookie(url: string, cookie: string) {
	const res = await fetch(url, {
		method: "GET",
		headers: { Cookie: cookie, "Content-Type": "application/json" },
	});
	if (!res.ok)
		throw new Error(`SportEasy API error: ${res.status} ${res.statusText}`);
	return res.json();
}

/** Sync attendance for a single practice from SportEasy.
 *  If two practices share the same calendar date, attendance is unioned from
 *  all SportEasy events on that date and stored against the earliest practice. */
export const syncPracticeAttendance = action({
	args: { practiceId: v.id("practices") },
	handler: async (ctx, args): Promise<{ synced: number; skipped: number }> => {
		const cookieSetting = await ctx.runQuery(
			internal.sporteasy.internalGetCookie,
		);
		const cookie = cookieSetting?.value || process.env.SPORTEASY_COOKIE || "";
		if (!cookie) throw new Error("SportEasy cookie not configured");

		const practice = await ctx.runQuery(
			internal.sporteasy.internalGetPractice,
			{
				id: args.practiceId,
			},
		);
		if (!practice) throw new Error("Practice not found");
		if (!practice.sporteasyId) throw new Error("Practice has no SportEasy ID");

		const dateKey = new Date(practice.date).toISOString().split("T")[0];

		// Fetch all season events to find every event on this date
		const eventsData = (await fetchWithCookie(
			`${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${SPORTEASY_SEASON_ID}`,
			cookie,
		)) as { results: SportEasyEvent[] };

		const dayEvents = (eventsData.results || []).filter(
			(e) =>
				!e.is_cancelled &&
				new Date(e.start_at).toISOString().split("T")[0] === dateKey,
		);

		// Union present player sport easy IDs across all events on this day
		const presentSporteasyIds = new Set<number>();
		for (const event of dayEvents) {
			try {
				const detail = (await fetchWithCookie(
					`${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${event.id}`,
					cookie,
				)) as SportEasyEventDetail;

				for (const attendee of detail.attendees) {
					if (attendee.attendance_status === "present") {
						for (const result of attendee.results) {
							presentSporteasyIds.add(result.profile.id);
						}
					}
				}
			} catch (e) {
				console.error(`Failed to fetch event ${event.id}:`, e);
			}
		}

		if (dayEvents.length === 0) {
			// Fall back to direct fetch using stored sporteasyId
			try {
				const detail = (await fetchWithCookie(
					`${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${practice.sporteasyId}`,
					cookie,
				)) as SportEasyEventDetail;
				for (const attendee of detail.attendees) {
					if (attendee.attendance_status === "present") {
						for (const result of attendee.results) {
							presentSporteasyIds.add(result.profile.id);
						}
					}
				}
			} catch (e) {
				console.error("Fallback fetch failed:", e);
			}
		}

		// Match sport easy IDs to local player IDs
		const players = await ctx.runQuery(
			internal.players.getPlayersBySportEasyIds,
			{ sporteasyIds: [...presentSporteasyIds] },
		);

		// Find all practices on this date to get the canonical (earliest) one
		const dayPractices = await ctx.runQuery(
			internal.attendance.internalGetPracticesByDate,
			{ dateKey },
		);
		const canonicalPractice =
			dayPractices.sort((a, b) => a.date - b.date)[0] ?? practice;

		let synced = 0;
		let skipped = 0;
		for (const player of players) {
			if (!player) {
				skipped++;
				continue;
			}
			await ctx.runMutation(internal.attendance.internalUpsertAttendance, {
				practiceId: canonicalPractice._id,
				playerId: player._id,
				attended: true,
				source: "sporteasy",
			});
			synced++;
		}

		return { synced, skipped };
	},
});

/** Sync all past practices that have a SportEasy ID. */
export const syncAllAttendance = action({
	args: {},
	handler: async (
		ctx,
	): Promise<{ practices: number; synced: number; errors: number }> => {
		const cookieSetting = await ctx.runQuery(
			internal.sporteasy.internalGetCookie,
		);
		const cookie = cookieSetting?.value || process.env.SPORTEASY_COOKIE || "";
		if (!cookie) throw new Error("SportEasy cookie not configured");

		const practices = await ctx.runQuery(
			internal.attendance.internalGetPastSporteasyPractices,
		);

		// Group by calendar date — we only need to sync once per date
		const byDate = new Map<string, (typeof practices)[0]>();
		for (const p of practices) {
			const dateKey = new Date(p.date).toISOString().split("T")[0];
			if (!byDate.has(dateKey)) {
				byDate.set(dateKey, p);
			}
		}

		// Fetch all season events once
		let allEvents: SportEasyEvent[] = [];
		try {
			const eventsData = (await fetchWithCookie(
				`${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${SPORTEASY_SEASON_ID}`,
				cookie,
			)) as { results: SportEasyEvent[] };
			allEvents = (eventsData.results || []).filter((e) => !e.is_cancelled);
		} catch (e) {
			throw new Error(`Failed to fetch SportEasy events: ${e}`);
		}

		// Group all events by date
		const eventsByDate = new Map<string, SportEasyEvent[]>();
		for (const e of allEvents) {
			const dk = new Date(e.start_at).toISOString().split("T")[0];
			const existing = eventsByDate.get(dk) ?? [];
			existing.push(e);
			eventsByDate.set(dk, existing);
		}

		let totalSynced = 0;
		let totalErrors = 0;

		for (const [dateKey, canonicalPractice] of byDate) {
			const dayEvents = eventsByDate.get(dateKey) ?? [];

			// Fall back to stored sporteasyId if no events found in season list
			const eventIds =
				dayEvents.length > 0
					? dayEvents.map((e) => e.id)
					: [canonicalPractice.sporteasyId as number];

			const presentSporteasyIds = new Set<number>();

			for (const eventId of eventIds) {
				try {
					const detail = (await fetchWithCookie(
						`${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${eventId}`,
						cookie,
					)) as SportEasyEventDetail;

					for (const attendee of detail.attendees) {
						if (attendee.attendance_status === "present") {
							for (const result of attendee.results) {
								presentSporteasyIds.add(result.profile.id);
							}
						}
					}
					// Throttle to avoid rate limiting
					await new Promise((r) => setTimeout(r, 150));
				} catch (e) {
					console.error(`Error fetching event ${eventId}:`, e);
					totalErrors++;
				}
			}

			const players = await ctx.runQuery(
				internal.players.getPlayersBySportEasyIds,
				{ sporteasyIds: [...presentSporteasyIds] },
			);

			// Get the actual canonical (earliest) practice for this date
			const dayPractices = await ctx.runQuery(
				internal.attendance.internalGetPracticesByDate,
				{ dateKey },
			);
			const canonical =
				dayPractices.sort((a, b) => a.date - b.date)[0] ?? canonicalPractice;

			for (const player of players) {
				if (!player) continue;
				await ctx.runMutation(internal.attendance.internalUpsertAttendance, {
					practiceId: canonical._id,
					playerId: player._id,
					attended: true,
					source: "sporteasy",
				});
				totalSynced++;
			}
		}

		return { practices: byDate.size, synced: totalSynced, errors: totalErrors };
	},
});
