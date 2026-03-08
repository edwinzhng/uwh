import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";

export const getPlayers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("players").collect();
	},
});

export const getPlayerById = query({
	args: { id: v.id("players") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const getPlayersByPosition = query({
	args: {
		position: v.union(
			v.literal("FORWARD"),
			v.literal("WING"),
			v.literal("CENTER"),
			v.literal("FULL_BACK"),
		),
	},
	handler: async (ctx, args) => {
		const players = await ctx.db.query("players").collect();
		return players.filter((player) => player.positions.includes(args.position));
	},
});

export const createPlayer = mutation({
	args: {
		fullName: v.string(),
		email: v.optional(v.string()),
		parentEmail: v.optional(v.string()),
		positions: v.array(
			v.union(
				v.literal("FORWARD"),
				v.literal("WING"),
				v.literal("CENTER"),
				v.literal("FULL_BACK"),
			),
		),
		rating: v.number(),
		youth: v.boolean(),
	},
	handler: async (ctx, args) => {
		// Check for email uniqueness if email is provided
		if (args.email) {
			const existing = await ctx.db
				.query("players")
				.withIndex("by_email", (q) => q.eq("email", args.email))
				.unique();
			if (existing) {
				throw new Error("Email already exists");
			}
		}

		return await ctx.db.insert("players", {
			fullName: args.fullName,
			email: args.email,
			parentEmail: args.parentEmail,
			positions: args.positions,
			rating: args.rating,
			youth: args.youth,
		});
	},
});

export const updatePlayer = mutation({
	args: {
		id: v.id("players"),
		fullName: v.optional(v.string()),
		email: v.optional(v.string()),
		parentEmail: v.optional(v.string()),
		positions: v.optional(
			v.array(
				v.union(
					v.literal("FORWARD"),
					v.literal("WING"),
					v.literal("CENTER"),
					v.literal("FULL_BACK"),
				),
			),
		),
		rating: v.optional(v.number()),
		youth: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { id, ...updates } = args;

		if (updates.email) {
			const existing = await ctx.db
				.query("players")
				.withIndex("by_email", (q) => q.eq("email", updates.email))
				.unique();
			if (existing && existing._id !== id) {
				throw new Error("Email already exists");
			}
		}

		// Clean undefined values
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined),
		);

		await ctx.db.patch(id, cleanUpdates);
		return await ctx.db.get(id);
	},
});

export const deletePlayer = mutation({
	args: { id: v.id("players") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
		return { success: true };
	},
});

export const getPlayersBySportEasyIds = internalQuery({
	args: { sporteasyIds: v.array(v.number()) },
	handler: async (ctx, args) => {
		const players = await Promise.all(
			args.sporteasyIds.map(async (sid) => {
				return await ctx.db
					.query("players")
					.withIndex("by_sporteasyId", (q) => q.eq("sporteasyId", sid))
					.unique();
			}),
		);
		return players.filter((p): p is Doc<"players"> => p !== null);
	},
});
