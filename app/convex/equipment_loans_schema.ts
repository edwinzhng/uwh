import { defineTable } from "convex/server";
import { v } from "convex/values";

export const equipmentLoanRequestValue = v.object({
	requestId: v.string(),
	id: v.string(),
	itemId: v.string(),
	due: v.string(),
	borrower: v.union(
		v.object({ kind: v.literal("member"), personId: v.string() }),
		v.object({
			kind: v.literal("guest"),
			guestId: v.string(),
			eventId: v.string(),
			name: v.string(),
		}),
	),
});
export const equipmentLoanTables = {
	equipmentGuests: defineTable({
		clubId: v.id("clubs"),
		id: v.string(),
		eventId: v.string(),
		name: v.string(),
		createdBy: v.optional(v.id("users")),
		createdAt: v.number(),
	})
		.index("by_club_key", ["clubId", "id"])
		.index("by_club_event", ["clubId", "eventId"])
		.index("by_creator", ["createdBy"])
		.index("by_club", ["clubId"]),
	equipmentLoanCommands: defineTable({
		clubId: v.id("clubs"),
		actorId: v.id("users"),
		requestId: v.string(),
		loanId: v.string(),
		personId: v.optional(v.string()),
		payload: v.string(),
		createdAt: v.number(),
	})
		.index("by_club_actor_request", ["clubId", "actorId", "requestId"])
		.index("by_actor", ["actorId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
};
