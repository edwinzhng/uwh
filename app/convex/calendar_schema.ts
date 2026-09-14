import { v } from "convex/values";

export const calendarEntry = v.object({
	eventId: v.string(),
	title: v.string(),
	description: v.string(),
	location: v.string(),
	start: v.number(),
	end: v.number(),
	status: v.union(
		v.literal("CONFIRMED"),
		v.literal("TENTATIVE"),
		v.literal("CANCELLED"),
	),
	uid: v.string(),
	sequence: v.number(),
	updatedAt: v.number(),
});
