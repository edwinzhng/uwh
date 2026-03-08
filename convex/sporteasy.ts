import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

export interface SportEasySyncResult {
	total: number;
	imported: number;
	updated: number;
	skipped: number;
}

import {
	type ActionCtx,
	action,
	internalMutation,
	internalQuery,
} from "./_generated/server";

const SPORTEASY_V2_3_BASE_URL = "https://api.sporteasy.net/v2.3";
const SPORTEASY_V2_1_BASE_URL = "https://api.sporteasy.net/v2.1";
const SPORTEASY_TEAM_ID = process.env.SPORTEASY_TEAM_ID || "2307567";
const SPORTEASY_SEASON_ID = process.env.SPORTEASY_SEASON_ID || "2633771";

// Helper to get the cookie
const getCookie = async (ctx: ActionCtx): Promise<string> => {
	const cookieSetting = await ctx.runQuery(
		internal.sporteasy.internalGetCookie,
	);
	const cookie = cookieSetting?.value || process.env.SPORTEASY_COOKIE;

	if (!cookie) {
		throw new Error("SportEasy cookie is not configured in settings or env");
	}

	return cookie;
};

export const internalGetCookie = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("settings")
			.withIndex("by_key", (q) => q.eq("key", "sporteasy_cookie"))
			.unique();
	},
});

interface SportEasyProfile {
	id: number;
	email?: string;
	first_name: string;
	last_name: string;
	parents?: Array<{ email?: string }>;
}

interface SportEasyEvent {
	id: number;
	name: string;
	start_at: string;
	is_cancelled?: boolean;
}

export interface SportEasyEventDetail {
	attendees: Array<{
		attendance_status: string;
		results: Array<{
			profile: {
				id: number;
			};
		}>;
	}>;
}

export const testConnection = action({
	args: {},
	handler: async (ctx): Promise<{ ok: boolean; error?: string }> => {
		try {
			const cookie = await getCookie(ctx);
			const url = `${SPORTEASY_V2_1_BASE_URL}/me/`;

			const response = await fetch(url, {
				method: "GET",
				headers: {
					Cookie: cookie,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				return {
					ok: false,
					error: `SportEasy API error: ${response.status} ${response.statusText}`,
				};
			}

			return { ok: true };
		} catch (e: unknown) {
			if (e instanceof Error) {
				return { ok: false, error: e.message };
			}
			return { ok: false, error: "Unknown error" };
		}
	},
});

// Import profiles action
export const importProfiles = action({
	args: {},
	handler: async (ctx): Promise<SportEasySyncResult> => {
		const cookie = await getCookie(ctx);
		const url = `${SPORTEASY_V2_3_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/profiles/`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Cookie: cookie,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`SportEasy API error: ${response.status} ${response.statusText}`,
			);
		}

		const profiles = await response.json();

		const results = (await ctx.runMutation(
			internal.sporteasy.internalSyncProfiles,
			{
				profiles: profiles,
			},
		)) as SportEasySyncResult;

		return results;
	},
});

export const internalSyncProfiles = internalMutation({
	args: { profiles: v.any() },
	handler: async (ctx, args) => {
		const profiles = args.profiles as SportEasyProfile[];
		const existingPlayers = await ctx.db.query("players").collect();

		const existingSporteasyIds = new Set(
			existingPlayers.map((p) => p.sporteasyId).filter(Boolean),
		);

		const importResults = {
			total: profiles.length,
			imported: 0,
			updated: 0,
			skipped: 0,
		};

		for (const profile of profiles) {
			const sportEasyId = profile.id;
			const email = profile.email ?? undefined;
			const fullName = `${profile.first_name} ${profile.last_name}`.trim();
			const parentEmail = profile.parents?.at(0)?.email ?? undefined;

			if (!email && !parentEmail) {
				importResults.skipped++;
				continue;
			}

			if (existingSporteasyIds.has(sportEasyId)) {
				importResults.updated++;
				// Update existing player
				const existingPlayer = existingPlayers.find(
					(p) => p.sporteasyId === sportEasyId,
				);
				if (existingPlayer) {
					const patch: Partial<Doc<"players">> = {};
					if (!existingPlayer.fullName) patch.fullName = fullName;
					if (!existingPlayer.email) patch.email = email;
					if (!existingPlayer.parentEmail) patch.parentEmail = parentEmail;

					if (Object.keys(patch).length > 0) {
						await ctx.db.patch(existingPlayer._id, patch);
					}
				}
			} else {
				importResults.imported++;
				// Insert new player
				await ctx.db.insert("players", {
					fullName,
					email: email,
					parentEmail: parentEmail,
					sporteasyId: sportEasyId,
					positions: ["FORWARD"],
					rating: 5,
					youth: !!parentEmail,
				});
			}
		}

		return importResults;
	},
});

export const getEventAttendees = action({
	args: { practiceId: v.id("practices") },
	handler: async (ctx, args): Promise<SportEasyEventDetail> => {
		const practice = await ctx.runQuery(
			internal.sporteasy.internalGetPractice,
			{ id: args.practiceId },
		);

		if (!practice) throw new Error("Practice not found");
		if (!practice.sporteasyId)
			throw new Error("No SportEasy ID associated with this practice");

		const cookie = await getCookie(ctx);
		const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/${practice.sporteasyId}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Cookie: cookie,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`SportEasy API error: ${response.status} ${response.statusText}`,
			);
		}

		const responseData = (await response.json()) as SportEasyEventDetail;
		return responseData;
	},
});

export const internalGetPractice = internalQuery({
	args: { id: v.id("practices") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Import events action
export const importEvents = action({
	args: {},
	handler: async (ctx): Promise<SportEasySyncResult> => {
		const cookie = await getCookie(ctx);
		const url = `${SPORTEASY_V2_1_BASE_URL}/teams/${SPORTEASY_TEAM_ID}/events/?season_id=${SPORTEASY_SEASON_ID}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Cookie: cookie,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`SportEasy API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as { results: SportEasyEvent[] };
		const events = data.results || [];

		const results = (await ctx.runMutation(
			internal.sporteasy.internalSyncEvents,
			{
				events: events,
			},
		)) as SportEasySyncResult;

		return results;
	},
});

export const internalSyncEvents = internalMutation({
	args: { events: v.any() },
	handler: async (ctx, args) => {
		const events = args.events as SportEasyEvent[];
		const existingPractices = await ctx.db.query("practices").collect();

		const importResults = {
			total: events.length,
			imported: 0,
			updated: 0,
			skipped: 0,
		};

		const isPracticeEvent = (text: string | null | undefined): boolean => {
			if (!text) return false;
			const lowerText = text.toLowerCase();
			const keywords = ["training", "hockey", "practice"];
			return keywords.some((keyword) => lowerText.includes(keyword));
		};

		const nonCancelledEvents = events.filter((event) => !event.is_cancelled);

		// Group events by date
		const eventsByDate = new Map<string, typeof nonCancelledEvents>();
		for (const event of nonCancelledEvents) {
			const eventDate = new Date(event.start_at);
			const dateKey = eventDate.toISOString().split("T")[0];

			if (!eventsByDate.has(dateKey)) {
				eventsByDate.set(dateKey, []);
			}
			eventsByDate.get(dateKey)?.push(event);
		}

		for (const [dateKey, dayEvents] of Array.from(eventsByDate.entries())) {
			const primaryEvent = dayEvents.find((e) => isPracticeEvent(e.name));

			const practiceDate = new Date(
				primaryEvent?.start_at || dayEvents[0].start_at,
			);

			const existingPractice = existingPractices.find((p) => {
				const pDate = new Date(p.date);
				return pDate.toISOString().split("T")[0] === dateKey;
			});

			const sporteasyId =
				primaryEvent?.id || existingPractice?.sporteasyId || dayEvents[0].id;

			const startsWithDayOfWeek = (name: string) => {
				const days = [
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
					"Sunday",
				];
				return days.some((day) => name.startsWith(day));
			};

			const filteredEvents = dayEvents.filter(
				(e) => !startsWithDayOfWeek(e.name),
			);
			const filteredNames = filteredEvents.map((e) => e.name).join(" | ");
			const allEventNames = dayEvents.map((e) => e.name).join(" · ");

			let notes = null;
			let displayName = null;
			if (primaryEvent && !startsWithDayOfWeek(primaryEvent.name)) {
				displayName = primaryEvent.name;
			} else if (filteredNames) {
				displayName = filteredNames;
			}

			if (displayName && allEventNames && displayName !== allEventNames) {
				notes = `${displayName} · ${allEventNames}`;
			} else if (allEventNames) {
				notes = allEventNames;
			} else if (displayName) {
				notes = displayName;
			}

			if (existingPractice) {
				importResults.updated++;
				await ctx.db.patch(existingPractice._id, {
					date: practiceDate.getTime(),
					notes: notes || undefined,
					sporteasyId: sporteasyId,
					updatedAt: Date.now(),
				});
			} else {
				importResults.imported++;
				await ctx.db.insert("practices", {
					date: practiceDate.getTime(),
					notes: notes || undefined,
					sporteasyId,
					updatedAt: Date.now(),
				});
			}
		}

		importResults.skipped = importResults.total - nonCancelledEvents.length;
		return importResults;
	},
});
