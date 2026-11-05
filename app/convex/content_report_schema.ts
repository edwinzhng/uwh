import { v } from "convex/values";

export const contentKind = v.union(
	v.literal("resource"),
	v.literal("comment"),
	v.literal("feedback"),
	v.literal("profile"),
	v.literal("notice"),
	v.literal("sessionPlan"),
);
export const contentReference = v.object({
	kind: contentKind,
	id: v.string(),
	revision: v.optional(v.number()),
});
export const contentReportSource = v.object({
	kind: contentKind,
	id: v.string(),
	version: v.string(),
});
