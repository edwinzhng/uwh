import { defineTable } from "convex/server";
import { v } from "convex/values";

export const threadToolsTables = {
	chatPolls: defineTable({
		messageId: v.optional(v.string()),
		counts: v.optional(v.array(v.number())),
		voterCount: v.optional(v.number()),
		clubId: v.id("clubs"),
		threadId: v.string(),
		key: v.string(),
		createdBy: v.id("users"),
		author: v.string(),
		question: v.string(),
		options: v.array(v.string()),
		multiple: v.boolean(),
		closesAt: v.optional(v.number()),
		closedAt: v.optional(v.number()),
	})
		.index("by_thread", ["clubId", "threadId"])
		.index("by_key", ["clubId", "key"])
		.index("by_club", ["clubId"]),
	chatPollVotes: defineTable({
		clubId: v.id("clubs"),
		pollId: v.id("chatPolls"),
		userId: v.id("users"),
		choices: v.array(v.number()),
	})
		.index("by_poll", ["pollId"])
		.index("by_poll_user", ["pollId", "userId"])
		.index("by_club", ["clubId"]),
	chatPins: defineTable({
		clubId: v.id("clubs"),
		threadId: v.string(),
		messageId: v.string(),
		pinnedBy: v.id("users"),
	})
		.index("by_thread", ["clubId", "threadId"])
		.index("by_message", ["clubId", "threadId", "messageId"])
		.index("by_club", ["clubId"]),
};
