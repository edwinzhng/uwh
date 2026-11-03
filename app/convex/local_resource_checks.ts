import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { eraseAccount } from "./account_erasure";
import { requireLocalEmail } from "./auth_mail";

export const cleanup = internalMutation({
	args: {
		prefix: v.union(
			v.literal("resources-"),
			v.literal("weekly-coaches-"),
			v.literal("chat-polls-"),
			v.literal("development-"),
		),
		createdBefore: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ prefix, createdBefore = Date.now() },
	): Promise<number> => {
		requireLocalEmail(`${prefix}cleanup@example.test`);
		if (process.env.PUSH_DELIVERY_ENABLED === "true")
			throw new Error("Local verification transports required.");
		if (
			!Number.isFinite(createdBefore) ||
			createdBefore <= 0 ||
			createdBefore > Date.now()
		)
			throw new Error("Choose a past verification cutoff.");
		const users = (await ctx.db.query("users").collect()).filter(
			(user) =>
				user.email?.startsWith(prefix) &&
				user.email.endsWith("@example.test") &&
				user._creationTime < createdBefore,
		);
		if (users.length > 30)
			throw new Error(
				"Review the fictional verification accounts before cleanup.",
			);
		const entries = await Promise.all(
			users.map(async (user) => ({
				user,
				membership: await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", user._id))
					.first(),
			})),
		);
		const clubs = new Map(
			(await ctx.db.query("clubs").collect()).map((club) => [club._id, club]),
		);
		const ordered = entries.toSorted(
			(left, right) =>
				Number(
					Boolean(
						left.membership &&
							clubs.get(left.membership.clubId)?.ownerId === left.user._id,
					),
				) -
				Number(
					Boolean(
						right.membership &&
							clubs.get(right.membership.clubId)?.ownerId === right.user._id,
					),
				),
		);
		for (const { user } of ordered) {
			requireLocalEmail(user.email ?? "");
			await eraseAccount(ctx, user._id);
		}
		return users.length;
	},
});
