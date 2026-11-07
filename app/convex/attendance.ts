import { v } from "convex/values";
import { canReadProgress } from "../src/domain/app-rules";
import { attendanceSummary } from "../src/domain/attendance-summary";
import { rankFitnessResults } from "../src/domain/fitness-ranking";
import { homeAttendance } from "../src/domain/home-attendance";
import { defaultSeasonId, initialSeasons } from "../src/domain/seasons";
import { query } from "./_generated/server";
import { loadData } from "./data";
import { accountFor, memberFor } from "./identity";
export const summary = query({
	args: { personId: v.string(), seasonId: v.string(), now: v.number() },
	handler: async (
		ctx,
		{ personId, seasonId, now },
	): Promise<ReturnType<typeof attendanceSummary> | null> => {
		const actor = await memberFor(ctx);
		if (!actor) return null;
		const { data, rows } = await loadData(ctx, actor.clubId, {
			select: { members: [personId] },
		});
		const member = data.members.at(0);
		const season = data.seasons.find((entry) => entry.id === seasonId);
		if (!member || !season || !canReadProgress(accountFor(actor), member))
			return null;
		const events = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.gte("value.date", season.start)
					.lte("value.date", season.end),
			)
			.collect();
		const filtered = events.filter(
			(event) => (event.value.seasonId ?? "2026-2027") === seasonId,
		);
		const loaded = await loadData(ctx, actor.clubId, {
			select: {
				responses: filtered.map((row) => `${row.value.id}:${personId}`),
			},
			rows: { members: rows.members, events: filtered },
		});
		return attendanceSummary(loaded.data, member, seasonId, now);
	},
});

export const home = query({
	args: { personId: v.string(), seasonId: v.string(), now: v.number() },
	handler: async (
		ctx,
		{ personId, seasonId, now },
	): Promise<ReturnType<typeof homeAttendance> | null> => {
		const actor = await memberFor(ctx);
		if (!actor) return null;
		const { data, rows } = await loadData(ctx, actor.clubId, {
			select: { members: [personId] },
		});
		const member = data.members.at(0);
		const season = data.seasons.find((entry) => entry.id === seasonId);
		if (!member || !season || !canReadProgress(accountFor(actor), member))
			return null;
		const events = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.gte("value.date", season.start)
					.lte("value.date", season.end),
			)
			.collect();
		const filtered = events.filter(
			(event) => (event.value.seasonId ?? "2026-2027") === seasonId,
		);
		const loaded = await loadData(ctx, actor.clubId, {
			select: {
				responses: filtered.map((row) => `${row.value.id}:${personId}`),
			},
			rows: { members: rows.members, events: filtered },
		});
		return homeAttendance(loaded.data, member, seasonId, now);
	},
});

export const competition = query({
	args: { personId: v.string(), seasonId: v.string(), now: v.number() },
	handler: async (
		ctx,
		{ personId, seasonId, now },
	): Promise<{
		minutes?: { best: number; rank?: number };
		practices?: { best: number; rank?: number };
	} | null> => {
		const actor = await memberFor(ctx);
		if (!actor) return null;
		const [club, members, events] = await Promise.all([
			ctx.db.get(actor.clubId),
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.take(501),
			ctx.db
				.query("events")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.take(2001),
		]);
		const person = members.find((entry) => entry.value.id === personId)?.value;
		if (!person || !canReadProgress(accountFor(actor), person)) return null;
		const season = (club?.seasons ?? initialSeasons).find(
			(entry) => entry.id === seasonId,
		);
		if (!season) return null;
		if (members.length > 500 || events.length > 2000)
			throw new Error(
				"Attendance standings are unavailable for this club size.",
			);
		const selected = events.filter(
			({ value }) =>
				value.date >= season.start &&
				value.date <= season.end &&
				(value.seasonId ?? defaultSeasonId) === seasonId,
		);
		const responseGroups = await Promise.all(
			selected.map((event) =>
				ctx.db
					.query("responses")
					.withIndex("by_event", (q) =>
						q.eq("clubId", actor.clubId).eq("value.eventId", event.value.id),
					)
					.take(501),
			),
		);
		if (responseGroups.some((group) => group.length > 500))
			throw new Error(
				"Attendance standings are unavailable for this club size.",
			);
		const loaded = await loadData(ctx, actor.clubId, {
			select: {},
			rows: { members, events: selected, responses: responseGroups.flat() },
		});
		const totals = loaded.data.members
			.filter((member) => !member.archived && !member.mergedInto)
			.map((member) => ({
				personId: member.id,
				...homeAttendance(
					loaded.data,
					member,
					seasonId,
					Math.min(now, Date.now()),
				),
			}));
		const result = (
			metric: "minutes" | "practices",
		): { best: number; rank?: number } | undefined => {
			const scores = totals
				.filter((entry) => entry[metric] > 0)
				.map((entry) => ({ personId: entry.personId, value: entry[metric] }));
			const rankings = rankFitnessResults({ unit: "count" }, scores);
			const mine = rankings.find((entry) => entry.personId === personId);
			const best = rankings.at(0);
			return best ? { best: best.value, rank: mine?.rank } : undefined;
		};
		return { minutes: result("minutes"), practices: result("practices") };
	},
});
