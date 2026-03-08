import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCoaches = query({
  args: {},
  handler: async (ctx) => {
    const coaches = await ctx.db.query("coaches").collect();
    
    // Join with players to get the coach name
    const coachesWithPlayers = await Promise.all(
      coaches.map(async (coach) => {
        const player = await ctx.db.get(coach.playerId);
        return {
          ...coach,
          player: player,
        };
      })
    );
    
    return coachesWithPlayers;
  },
});

export const getCoachById = query({
  args: { id: v.id("coaches") },
  handler: async (ctx, args) => {
    const coach = await ctx.db.get(args.id);
    if (!coach) return null;
    
    const player = await ctx.db.get(coach.playerId);
    return {
      ...coach,
      player: player,
    };
  },
});

export const getCoachByPlayerId = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
    return coach;
  },
});

export const createCoach = mutation({
  args: {
    playerId: v.id("players"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if coach already exists for this player
    const existingCoach = await ctx.db
      .query("coaches")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existingCoach) {
      throw new Error("Coach already exists for this player");
    }

    return await ctx.db.insert("coaches", {
      playerId: args.playerId,
      isActive: args.isActive ?? true,
    });
  },
});

export const updateCoach = mutation({
  args: {
    id: v.id("coaches"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Clean undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

export const deleteCoach = mutation({
  args: { id: v.id("coaches") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
