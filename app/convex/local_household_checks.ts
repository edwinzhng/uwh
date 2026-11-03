import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export const seedLegacyProofs = internalMutation({
	args: {
		clubId: v.id("clubs"),
		ownerId: v.id("users"),
		userId: v.id("users"),
		personId: v.string(),
	},
	handler: async (ctx, input): Promise<Id<"householdLinks">> => {
		const [club, owner, user, membership, person] = await Promise.all([
			ctx.db.get(input.clubId),
			ctx.db.get(input.ownerId),
			ctx.db.get(input.userId),
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", input.userId))
				.unique(),
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", input.clubId).eq("value.id", input.personId),
				)
				.unique(),
		]);
		requireLocalEmail(owner?.email ?? "");
		requireLocalEmail(user?.email ?? "");
		if (
			!owner?.email?.startsWith("household-") ||
			!user?.email?.startsWith("household-") ||
			club?.ownerId !== input.ownerId ||
			club.name !== "Household verification" ||
			membership?.clubId !== input.clubId ||
			!person ||
			process.env.PUSH_DELIVERY_ENABLED === "true"
		)
			throw new Error("Isolated fictional household fixture required.");
		const ids = await Promise.all(
			Array.from({ length: 102 }, (_, index) =>
				ctx.db.insert("householdLinks", {
					clubId: input.clubId,
					userId: input.userId,
					personId: input.personId,
					origin: "previous",
					state: "available",
					key: `legacy-proof:${index}`,
					payload: input.personId,
					createdAt: Date.now(),
				}),
			),
		);
		const last = ids.at(-1);
		if (!last) throw new Error("Legacy fixture unavailable.");
		return last;
	},
});
