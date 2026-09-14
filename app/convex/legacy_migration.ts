import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { positionValue } from "./player_coaching_schema";
import { scheduleSignup } from "./signup";
import { eventsValue } from "./validators";

export const setInitialPassword = internalMutation({
	args: { passwordHash: v.string() },
	handler: async (ctx, args): Promise<void> => {
		const email = "edwinzhang64@gmail.com";
		const user = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", email))
			.unique();
		if (!user?.emailVerificationTime)
			throw new Error("Verified migrated account required.");
		const existing = await ctx.db
			.query("authAccounts")
			.withIndex("providerAndAccountId", (q) =>
				q.eq("provider", "password").eq("providerAccountId", email),
			)
			.unique();
		if (existing)
			throw new Error("A password already exists. Use password recovery.");
		if (!/^[a-f0-9]+:[a-f0-9]+$/i.test(args.passwordHash))
			throw new Error("Invalid password hash.");
		await ctx.db.insert("authAccounts", {
			userId: user._id,
			provider: "password",
			providerAccountId: email,
			secret: args.passwordHash,
			emailVerified: email,
		});
	},
});

export const migrate = internalMutation({
	args: {
		dryRun: v.boolean(),
		email: v.string(),
		name: v.string(),
		googleAccountId: v.string(),
		personId: v.string(),
		rating: v.number(),
		positions: v.array(positionValue),
		events: v.array(eventsValue),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ clubId?: Id<"clubs">; events: number; dryRun: boolean }> => {
		if (
			args.email !== "edwinzhang64@gmail.com" ||
			args.events.some(
				(event) => event.date < "2026-09-03" || event.date > "2027-08-31",
			)
		)
			throw new Error("Migration exceeds the approved account or season.");
		if (
			new Set(args.events.map((event) => event.id)).size !== args.events.length
		)
			throw new Error("Duplicate practice IDs.");
		const existingUser = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", args.email))
			.unique();
		const existingMembership = existingUser
			? await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", existingUser._id))
					.unique()
			: undefined;
		if (args.dryRun)
			return {
				clubId: existingMembership?.clubId,
				events: args.events.length,
				dryRun: true,
			};
		if (existingUser && !existingMembership)
			throw new Error("Review the existing account before migrating.");
		const userId =
			existingUser?._id ??
			(await ctx.db.insert("users", {
				email: args.email,
				name: args.name,
				emailVerificationTime: Date.now(),
			}));
		if (!existingUser)
			await ctx.db.insert("authAccounts", {
				userId,
				provider: "google",
				providerAccountId: args.googleAccountId,
			});
		const clubId =
			existingMembership?.clubId ??
			(await ctx.db.insert("clubs", {
				name: "Calgary Crocs",
				ownerId: userId,
				timeZone: "America/Edmonton",
				reminders: false,
				seasons: [
					{
						id: "2026-2027",
						name: "2026–2027",
						start: "2026-09-03",
						end: "2027-08-31",
					},
				],
				venues: [...new Set(args.events.map((event) => event.venue))],
			}));
		if (!existingMembership) {
			await ctx.db.insert("memberships", {
				clubId,
				userId,
				name: args.name,
				personId: args.personId,
				children: [],
				coachPrograms: ["club", "youth"],
				admin: true,
			});
			await ctx.db.insert("members", {
				clubId,
				value: {
					id: args.personId,
					name: args.name,
					programs: ["club"],
					position: "Center",
					rating: args.rating,
					registration: "missing",
					goal: "",
					steps: 0,
				},
			});
			await ctx.db.insert("playerCoaching", {
				clubId,
				personId: args.personId,
				rating: args.rating,
				positions: args.positions,
				ageGroup: "adult",
				revision: 0,
			});
			await ctx.db.insert("conversations", {
				clubId,
				value: {
					id: "club",
					title: "Club room",
					subtitle: "Club members",
					accountIds: [userId],
				},
			});
		}
		for (const event of args.events) {
			const existing = await ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", event.id),
				)
				.unique();
			if (existing) continue;
			await ctx.db.insert("events", { clubId, value: event });
			if (!event.cancelled) await scheduleSignup(ctx, clubId, event);
		}
		return { clubId, events: args.events.length, dryRun: false };
	},
});
