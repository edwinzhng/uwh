import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getPractices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("practices")
      .withIndex("by_date")
      .order("desc")
      .collect();
  },
});

export const getUpcomingPractices = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const practices = await ctx.db
      .query("practices")
      .withIndex("by_date", (q) => q.gte("date", now))
      .order("asc")
      .collect();

    return await Promise.all(
      practices.map(async (practice) => {
        const practiceCoaches = await ctx.db
          .query("practiceCoaches")
          .withIndex("by_practiceId", (q) => q.eq("practiceId", practice._id))
          .collect();

        const coachesWithNames = await Promise.all(
          practiceCoaches.map(async (pc) => {
            const coach = await ctx.db.get(pc.coachId);
            if (!coach) return { ...pc, coachName: "Unknown Coach" };
            const player = await ctx.db.get(coach.playerId);
            return {
              ...pc,
              coachName: player?.fullName ?? "Unknown Coach",
            };
          })
        );
        return {
          ...practice,
          practiceCoaches: coachesWithNames,
        };
      })
    );
  },
});

export const getPastPractices = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const practices = await ctx.db
      .query("practices")
      .withIndex("by_date", (q) => q.lt("date", now))
      .order("desc")
      .collect();

    return await Promise.all(
      practices.map(async (practice) => {
        const practiceCoaches = await ctx.db
          .query("practiceCoaches")
          .withIndex("by_practiceId", (q) => q.eq("practiceId", practice._id))
          .collect();
        const coachesWithNames = await Promise.all(
          practiceCoaches.map(async (pc) => {
            const coach = await ctx.db.get(pc.coachId);
            if (!coach) return { ...pc, coachName: "Unknown Coach" };
            const player = await ctx.db.get(coach.playerId);
            return {
              ...pc,
              coachName: player?.fullName ?? "Unknown Coach",
            };
          })
        );
        return {
          ...practice,
          practiceCoaches: coachesWithNames,
        };
      })
    );
  },
});

export const getPracticeById = query({
  args: { id: v.id("practices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPracticeDetails = query({
  args: { id: v.id("practices") },
  handler: async (ctx, args) => {
    const practice = await ctx.db.get(args.id);
    if (!practice) return null;

    // Get coaches
    const practiceCoaches = await ctx.db
      .query("practiceCoaches")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
      .collect();

    const coachesWithDetails = await Promise.all(
      practiceCoaches.map(async (pc) => {
        const coach = await ctx.db.get(pc.coachId);
        if (!coach) return null;
        const player = await ctx.db.get(coach.playerId);
        return {
          ...pc,
          coach: {
            ...coach,
            player,
          },
        };
      })
    );

    // Get player statuses
    const playerStatuses = await ctx.db
      .query("practicePlayerStatuses")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
      .collect();

    const statusesWithPlayers = await Promise.all(
      playerStatuses.map(async (ps) => {
        const player = await ctx.db.get(ps.playerId);
        return {
          ...ps,
          player,
        };
      })
    );

    return {
      ...practice,
      coaches: coachesWithDetails.filter(Boolean),
      playerStatuses: statusesWithPlayers,
    };
  },
});

export const createPractice = mutation({
  args: {
    date: v.number(),
    notes: v.optional(v.string()),
    sporteasyId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("practices", {
      date: args.date,
      notes: args.notes,
      sporteasyId: args.sporteasyId,
      updatedAt: now,
    });
  },
});

export const updatePractice = mutation({
  args: {
    id: v.id("practices"),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    sporteasyId: v.optional(v.number()),
    discordReminderSentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Clean undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(id);
  },
});

export const deletePractice = mutation({
  args: { id: v.id("practices") },
  handler: async (ctx, args) => {
    // Delete associated coaches
    const coaches = await ctx.db
      .query("practiceCoaches")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
      .collect();
    for (const pc of coaches) {
      await ctx.db.delete(pc._id);
    }

    // Delete associated player statuses
    const statuses = await ctx.db
      .query("practicePlayerStatuses")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.id))
      .collect();
    for (const ps of statuses) {
      await ctx.db.delete(ps._id);
    }

    // Finally delete the practice
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const addCoachToPractice = mutation({
  args: {
    practiceId: v.id("practices"),
    coachId: v.id("coaches"),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practiceCoaches")
      .withIndex("by_practiceId_and_coachId", (q) => 
        q.eq("practiceId", args.practiceId).eq("coachId", args.coachId)
      )
      .unique();

    if (existing) {
      throw new Error("Coach already assigned to this practice");
    }

    return await ctx.db.insert("practiceCoaches", {
      practiceId: args.practiceId,
      coachId: args.coachId,
      durationMinutes: args.durationMinutes ?? 90,
    });
  },
});

export const removeCoachFromPractice = mutation({
  args: {
    practiceId: v.id("practices"),
    coachId: v.id("coaches"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practiceCoaches")
      .withIndex("by_practiceId_and_coachId", (q) => 
        q.eq("practiceId", args.practiceId).eq("coachId", args.coachId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

export const setPracticeCoaches = mutation({
  args: {
    practiceId: v.id("practices"),
    coachIds: v.array(v.id("coaches")),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Remove existing
    const existing = await ctx.db
      .query("practiceCoaches")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
      .collect();
      
    for (const pc of existing) {
      await ctx.db.delete(pc._id);
    }
    
    // Add new ones
    for (const coachId of args.coachIds) {
      await ctx.db.insert("practiceCoaches", {
        practiceId: args.practiceId,
        coachId: coachId,
        durationMinutes: args.durationMinutes ?? 90,
      });
    }
    
    return { success: true };
  },
});

export const setPlayerStatus = mutation({
  args: {
    practiceId: v.id("practices"),
    playerId: v.id("players"),
    statusType: v.union(v.literal("LAST_MINUTE_ADDITION"), v.literal("LAST_MINUTE_CANCELLATION"), v.literal("LATE")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practicePlayerStatuses")
      .withIndex("by_practiceId_and_playerId", (q) => 
        q.eq("practiceId", args.practiceId).eq("playerId", args.playerId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { statusType: args.statusType });
      return existing._id;
    } else {
      return await ctx.db.insert("practicePlayerStatuses", {
        practiceId: args.practiceId,
        playerId: args.playerId,
        statusType: args.statusType,
      });
    }
  },
});

export const removePlayerStatus = mutation({
  args: {
    practiceId: v.id("practices"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practicePlayerStatuses")
      .withIndex("by_practiceId_and_playerId", (q) => 
        q.eq("practiceId", args.practiceId).eq("playerId", args.playerId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});
