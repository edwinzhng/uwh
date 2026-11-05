import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";
import { writeStaffInvite } from "./staff_invites";

export const operatorInvite = internalMutation({
	args: { clubId: v.id("clubs"), mismatchedOwner: v.optional(v.id("users")) },
	handler: async (ctx, { clubId, mismatchedOwner }): Promise<string> => {
		const club = await ctx.db.get(clubId);
		const owner = club && (await ctx.db.get(club.ownerId));
		const email = owner?.email ?? "";
		requireLocalEmail(email);
		if (
			!club ||
			!email.startsWith("staff-invites-") ||
			!email.endsWith("@example.test") ||
			process.env.OUTBOUND_DELIVERY_DISABLED !== "true"
		)
			throw new Error("Isolated staff invite fixtures only.");
		return writeStaffInvite(
			ctx,
			club,
			{ admin: true, coachPrograms: ["club"] },
			{ ownerAtIssue: mismatchedOwner ?? club.ownerId },
		);
	},
});

export const expire = internalMutation({
	args: { id: v.id("staffInvites") },
	handler: async (ctx, { id }): Promise<void> => {
		const invite = await ctx.db.get(id);
		const club = invite && (await ctx.db.get(invite.clubId));
		const owner = club && (await ctx.db.get(club.ownerId));
		const email = owner?.email ?? "";
		requireLocalEmail(email);
		if (
			!email.startsWith("staff-invites-") ||
			!email.endsWith("@example.test") ||
			process.env.OUTBOUND_DELIVERY_DISABLED !== "true" ||
			!invite
		)
			throw new Error("Isolated staff invite fixtures only.");
		await ctx.db.patch(id, { expiresAt: Date.now() - 1 });
	},
});
