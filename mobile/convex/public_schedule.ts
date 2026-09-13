import { Temporal } from "@js-temporal/polyfill";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { validDate } from "../src/domain/app-rules";
import type { ClubEvent } from "../src/domain/app-types";
import { defaultClubTimeZone } from "../src/domain/time-zones";
import { mutation, query } from "./_generated/server";
import { requireMember } from "./identity";

export const settings = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{ slug: string; enabled: boolean; baseUrl: string }> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const club = await ctx.db.get(actor.clubId);
		return {
			slug: club?.publicSlug ?? "",
			enabled: club?.publicSchedule ?? false,
			baseUrl: process.env.SITE_URL ?? "",
		};
	},
});
export const configure = mutation({
	args: { slug: v.string(), enabled: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const slug = args.slug.trim().toLowerCase();
		if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug))
			throw new Error("Use 3–60 lowercase letters, numbers or hyphens.");
		const existing = await ctx.db
			.query("clubs")
			.withIndex("by_public_slug", (q) => q.eq("publicSlug", slug))
			.unique();
		if (existing && existing._id !== actor.clubId)
			throw new Error("That address is taken.");
		await ctx.db.patch(actor.clubId, {
			publicSlug: slug,
			publicSchedule: args.enabled,
		});
	},
});
export const info = query({
	args: { slug: v.string() },
	handler: async (
		ctx,
		{ slug },
	): Promise<{ name: string; feedUrl: string; timeZone: string } | null> => {
		const club = await ctx.db
			.query("clubs")
			.withIndex("by_public_slug", (q) => q.eq("publicSlug", slug))
			.unique();
		return club?.publicSchedule
			? {
					name: club.name,
					timeZone: club.timeZone ?? defaultClubTimeZone,
					feedUrl: `${process.env.CONVEX_SITE_URL ?? ""}/public-calendar.ics?club=${encodeURIComponent(slug)}`,
				}
			: null;
	},
});
export const events = query({
	args: {
		slug: v.string(),
		from: v.string(),
		to: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		args,
	): Promise<
		PaginationResult<
			Pick<
				ClubEvent,
				| "id"
				| "title"
				| "date"
				| "endDate"
				| "start"
				| "end"
				| "venue"
				| "cancelled"
				| "timeZone"
			>
		>
	> => {
		if (
			!validDate(args.from) ||
			!validDate(args.to) ||
			args.to < args.from ||
			Date.parse(args.to) - Date.parse(args.from) > 32 * 86400000
		)
			throw new Error("Choose a month.");
		const club = await ctx.db
			.query("clubs")
			.withIndex("by_public_slug", (q) => q.eq("publicSlug", args.slug))
			.unique();
		if (!club?.publicSchedule)
			return { page: [], isDone: true, continueCursor: "" };
		const result = await ctx.db
			.query("events")
			.withIndex("by_public_date", (q) =>
				q
					.eq("clubId", club._id)
					.eq("value.public", true)
					.gte(
						"value.date",
						Temporal.PlainDate.from(args.from)
							.subtract({ days: 13 })
							.toString(),
					)
					.lte("value.date", args.to),
			)
			.filter((q) =>
				q.or(
					q.gte(q.field("value.date"), args.from),
					q.gte(q.field("value.endDate"), args.from),
				),
			)
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 50),
			});
		return {
			...result,
			page: result.page.map(({ value }) => ({
				id: value.id,
				timeZone: value.timeZone ?? defaultClubTimeZone,
				title: value.title,
				date: value.date,
				endDate: value.endDate,
				start: value.start,
				end: value.end,
				venue: value.venue,
				cancelled: value.cancelled,
			})),
		};
	},
});
