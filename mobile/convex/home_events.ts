import { Temporal } from "@js-temporal/polyfill";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { homeSchedule, relevantHouseholdEvent } from "../src/domain/home";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const homeEvents = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	screen: string,
): Promise<Doc<"events">[]> => {
	const club = await ctx.db.get(member.clubId);
	const now = Date.now();
	const today = Temporal.PlainDate.from(clubDate(now, club?.timeZone));
	const through = today.add({ years: 1 }).toString();
	const [upcoming, tournaments, household] = await Promise.all([
		screen === "home"
			? ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q
							.eq("clubId", member.clubId)
							.gte("value.date", today.toString())
							.lte("value.date", through),
					)
					.collect()
			: [],
		ctx.db
			.query("events")
			.withIndex("by_club_kind_date", (q) =>
				q
					.eq("clubId", member.clubId)
					.eq("value.kind", "tournament")
					.gte("value.date", today.subtract({ days: 14 }).toString())
					.lte("value.date", through),
			)
			.collect(),
		Promise.all(
			[member.personId, ...member.children].map((id) =>
				ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", member.clubId).eq("value.id", id),
					)
					.unique(),
			),
		),
	]);
	const people = household.flatMap((row) => (row ? [row.value] : []));
	const unique = new Map(
		[...upcoming, ...tournaments].map((row) => [row.value.id, row]),
	);
	const active = [...unique.values()].filter(
		(row) =>
			!row.value.cancelled &&
			clubTimestamp(
				row.value.endDate ?? row.value.date,
				row.value.end,
				row.value.timeZone ?? club?.timeZone,
			) > now,
	);
	const relevant = active.filter((row) =>
		relevantHouseholdEvent(row.value, people),
	);
	if (screen !== "home") return relevant;
	const coaching = member.coachPrograms.length
		? active
				.filter(
					(row) => row.value.kind === "training" || row.value.kind === "hockey",
				)
				.toSorted((a, b) =>
					(a.value.date + a.value.start).localeCompare(
						b.value.date + b.value.start,
					),
				)
				.at(0)
		: undefined;
	const schedule = homeSchedule(
		relevant.map((row) => row.value),
		now,
		club?.timeZone,
	);
	const ids = new Set([
		...(coaching ? [coaching.value.id] : []),
		...schedule.events.map((event) => event.id),
		...(schedule.nextTournament ? [schedule.nextTournament.id] : []),
	]);
	return active.filter((row) => ids.has(row.value.id));
};
