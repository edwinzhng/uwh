import { Temporal } from "@js-temporal/polyfill";
import { v } from "convex/values";
import {
	calendarPartDescription,
	reconcileCalendar,
	renderCalendar,
} from "../src/domain/calendar-export";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";
export const read = internalMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }): Promise<string | null> => {
		const club = await ctx.db
			.query("clubs")
			.withIndex("by_public_slug", (q) => q.eq("publicSlug", slug))
			.unique();
		if (!club?.publicSchedule) return null;
		const today = Temporal.PlainDate.from(clubDate(undefined, club.timeZone));
		const from = today.subtract({ months: 1 }).toString();
		const to = today.add({ months: 18 }).toString();
		const rows = await ctx.db
			.query("events")
			.withIndex("by_public_date", (q) =>
				q
					.eq("clubId", club._id)
					.eq("value.public", true)
					.gte("value.date", from)
					.lte("value.date", to),
			)
			.take(1001);
		if (rows.length > 1000) return null;
		const previous = await ctx.db
			.query("publicCalendarEntries")
			.withIndex("by_club", (q) => q.eq("clubId", club._id))
			.collect();
		const current = rows
			.filter((row) => !row.value.cancelled)
			.map(({ value }) => ({
				eventId: value.id,
				title: value.title,
				description: calendarPartDescription(value),
				location: value.venue,
				start: clubTimestamp(value.date, value.start, value.timeZone),
				end: clubTimestamp(value.date, value.end, value.timeZone),
				status: "CONFIRMED" as const,
			}));
		const entries = reconcileCalendar(
			previous.map((row) => row.value),
			current,
			club._id,
			"public",
			Date.now(),
		).filter(
			(entry) => entry.end >= clubTimestamp(from, "00:00", club.timeZone),
		);
		for (const entry of entries) {
			const old = previous.find((row) => row.value.eventId === entry.eventId);
			const value =
				entry.status === "CANCELLED"
					? {
							...entry,
							title: "Cancelled event",
							location: "",
							description: "",
						}
					: entry;
			if (!old)
				await ctx.db.insert("publicCalendarEntries", {
					clubId: club._id,
					value,
				});
			else if (JSON.stringify(old.value) !== JSON.stringify(value))
				await ctx.db.patch(old._id, { value });
		}
		for (const row of previous.filter(
			(row) => !entries.some((entry) => entry.eventId === row.value.eventId),
		))
			await ctx.db.delete(row._id);
		return renderCalendar(
			`${club.name} · Public schedule`,
			entries.map((entry) =>
				entry.status === "CANCELLED"
					? {
							...entry,
							title: "Cancelled event",
							location: "",
							description: "",
						}
					: entry,
			),
			"PUBLIC",
		);
	},
});
export const feed = httpAction(async (ctx, request): Promise<Response> => {
	const slug = new URL(request.url).searchParams.get("club") ?? "";
	const calendar = await ctx.runMutation(internal.public_calendar.read, {
		slug,
	});
	return new Response(calendar ?? "Calendar unavailable.", {
		status: calendar ? 200 : 404,
		headers: {
			"Content-Type": calendar ? "text/calendar; charset=utf-8" : "text/plain",
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
});
