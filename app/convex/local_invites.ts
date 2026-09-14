import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export const age = internalMutation({
	args: { id: v.id("clubInvites"), expire: v.boolean() },
	handler: async (ctx, { id, expire }): Promise<void> => {
		const invite = await ctx.db.get(id);
		if (!invite) throw new Error("Invite missing.");
		requireLocalEmail(invite.email);
		await ctx.db.patch(id, {
			lastSentAt: Date.now() - 61000,
			...(expire ? { expiresAt: Date.now() - 1 } : {}),
		});
		const limit = await ctx.db
			.query("inviteLimits")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", invite.clubId).eq("key", `email:${invite.email}`),
			)
			.unique();
		if (limit) await ctx.db.delete(limit._id);
	},
});
