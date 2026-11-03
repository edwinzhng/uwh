import { v } from "convex/values";

export const notificationTopic = v.union(
	v.literal("groupMessage"),
	v.literal("directMessage"),
	v.literal("coachMessage"),
	v.literal("chatAnnouncement"),
	v.literal("coachingFeedback"),
	v.literal("shoutout"),
	v.literal("event"),
	v.literal("video"),
	v.literal("document"),
	v.literal("lineup"),
	v.literal("sessionPlan"),
	v.literal("rsvpNo"),
	v.literal("goalRequest"),
	v.literal("progress"),
);
export const notificationSourceFields = {
	topic: v.optional(notificationTopic),
	relatedId: v.optional(v.string()),
	partId: v.optional(v.string()),
	sourceRevision: v.optional(v.number()),
	staffOnly: v.optional(v.boolean()),
};
export const notificationPreference = v.union(
	v.literal("messages"),
	v.literal("directMessages"),
	v.literal("coachMessages"),
	v.literal("events"),
	v.literal("feedback"),
	v.literal("shoutouts"),
	v.literal("announcements"),
	v.literal("videos"),
	v.literal("documents"),
	v.literal("lineups"),
	v.literal("plans"),
	v.literal("rsvpNo"),
	v.literal("goalRequests"),
	v.literal("progress"),
);
export const granularPreferenceFields = {
	directMessages: v.optional(v.boolean()),
	coachMessages: v.optional(v.boolean()),
	shoutouts: v.optional(v.boolean()),
	videos: v.optional(v.boolean()),
	documents: v.optional(v.boolean()),
	lineups: v.optional(v.boolean()),
	plans: v.optional(v.boolean()),
	rsvpNo: v.optional(v.boolean()),
	goalRequests: v.optional(v.boolean()),
	progress: v.optional(v.boolean()),
};
