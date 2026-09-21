import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import { internalMutation } from "./_generated/server";

const samples = [
	{
		date: "2026-09-22",
		title: "Sample · Skills and puck control",
		kind: "training",
	},
	{
		date: "2026-09-24",
		title: "Sample · Thursday club practice",
		kind: "training",
	},
	{ date: "2026-09-25", title: "Sample · Friday scrimmage", kind: "hockey" },
	{ date: "2026-09-27", title: "Sample · Sunday skills", kind: "training" },
	{
		date: "2026-09-29",
		title: "Sample · Club planning meeting",
		kind: "meeting",
	},
	{
		date: "2026-10-01",
		title: "Sample · Team tactics practice",
		kind: "training",
	},
	{
		date: "2026-10-03",
		title: "Sample · Fall mini tournament",
		kind: "tournament",
	},
	{ date: "2026-10-04", title: "Sample · Team social", kind: "social" },
] satisfies Pick<ClubEvent, "date" | "title" | "kind">[];

export const seedUpcoming = internalMutation({
	args: { clubId: v.id("clubs") },
	handler: async (
		ctx,
		{ clubId },
	): Promise<{ added: number; existing: number }> => {
		if (
			process.env.CONVEX_CLOUD_URL !== "https://oceanic-gopher-942.convex.cloud"
		)
			throw new Error(
				"Sample events are restricted to the Calgary development deployment.",
			);
		const club = await ctx.db.get(clubId);
		if (club?.name !== "Calgary Crocs · Development")
			throw new Error("Select the development club.");
		const existing = await ctx.db
			.query("events")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		const ids = new Set(existing.map((row) => row.value.id));
		const missing = samples.filter(
			(sample) => !ids.has(`dev-sample-${sample.date}`),
		);
		await Promise.all(
			missing.map(async (sample): Promise<void> => {
				await ctx.db.insert("events", {
					clubId,
					value: {
						...sample,
						id: `dev-sample-${sample.date}`,
						program: "club",
						timeZone: club.timeZone ?? "America/Edmonton",
						start: "19:00",
						end: "20:30",
						venue:
							sample.kind === "social" || sample.kind === "meeting"
								? "Sample club meeting room"
								: "MNP Community & Sport Centre",
						description:
							"Fictional development event for testing schedule cards and attendance responses. This is not a real booking.",
						signup: "open",
						capacity: 24,
						cancelled: false,
						public: false,
					},
				});
			}),
		);
		return { added: missing.length, existing: samples.length - missing.length };
	},
});
