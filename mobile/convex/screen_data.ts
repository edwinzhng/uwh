import { canManagePerson } from "../src/domain/app-rules";
import type { AppData } from "../src/domain/app-types";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { eventRows } from "./action_data";
import { type DataSelection, loadData, type Rows } from "./data";
import { accountFor } from "./identity";

export const screenData = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	screen: string,
	id?: string,
): Promise<AppData> => {
	const clubId = member.clubId;
	const family = [member.personId, ...member.children];
	const people = [
		...new Set([...family, ...(id && screen === "member" ? [id] : [])]),
	];
	const roster = ["schedule", "session", "equipment", "settings"].includes(
		screen,
	);
	const notices = await ctx.db
		.query("notices")
		.withIndex("by_date", (q) => q.eq("clubId", clubId))
		.order("desc")
		.take(20);
	const select: DataSelection = { members: roster ? true : people };
	const rows: Partial<Rows> = { notices };
	if (screen === "session" && id) {
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", id),
			)
			.unique();
		const seriesId = event?.value.seriesId;
		const events =
			member.admin && seriesId
				? await ctx.db
						.query("events")
						.withIndex("by_series", (q) =>
							q.eq("clubId", clubId).eq("value.seriesId", seriesId),
						)
						.collect()
				: event
					? [event]
					: [];
		const ids = events.map((entry) => entry.value.id);
		rows.events = events;
		rows.responses = await eventRows(ctx, clubId, ids);
		select.teams = ids;
		select.plans = ids;
	}
	if (["club", "member"].includes(screen)) {
		const targetIds = people.filter(
			(personId) =>
				member.admin || canManagePerson(accountFor(member), personId),
		);
		select.charges = targetIds;
		select.trackers = true;
		const trackers = await ctx.db
			.query("trackers")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		rows.trackers = trackers;
		select.trackerValues = targetIds.flatMap((personId) =>
			trackers.map((row) => `${row.value.id}:${personId}`),
		);
		rows.loans = (
			await Promise.all(
				targetIds.map((personId) =>
					ctx.db
						.query("loans")
						.withIndex("by_person_active", (q) =>
							q
								.eq("clubId", clubId)
								.eq("value.personId", personId)
								.eq("value.returned", false),
						)
						.collect(),
				),
			)
		).flat();
		select.equipment = rows.loans.map((row) => row.value.itemId);
	}
	if (screen === "equipment" && member.admin) {
		select.equipment = true;
		rows.loans = await ctx.db
			.query("loans")
			.withIndex("by_returned", (q) =>
				q.eq("clubId", clubId).eq("value.returned", false),
			)
			.collect();
	}
	if (screen === "settings" && member.admin) select.trackers = true;
	const loaded = await loadData(ctx, clubId, { select, rows });
	const legacy = loaded.rows.charges.filter(
		(row) => row.paidTotal === undefined,
	);
	const totals = await Promise.all(
		legacy.map(async (charge): Promise<[string, number]> => {
			const payments = await ctx.db
				.query("payments")
				.withIndex("by_person", (q) =>
					q.eq("clubId", clubId).eq("value.personId", charge.value.personId),
				)
				.collect();
			return [
				charge.value.personId,
				payments.reduce((sum, row) => sum + row.value.amount, 0),
			];
		}),
	);
	return {
		...loaded.data,
		paymentTotals: {
			...loaded.data.paymentTotals,
			...Object.fromEntries(totals),
		},
	};
};
