import { v } from "convex/values";
import { canReadProgress } from "../src/domain/app-rules";
import { attendanceSummary } from "../src/domain/attendance-summary";
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
