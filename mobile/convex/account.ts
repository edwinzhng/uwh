import { getAuthSessionId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { eraseAccount } from "./account_erasure";
import { recentVerification } from "./connected_accounts";
import { getAuthUserId, requireMember } from "./identity";

export const current = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{
		id: Id<"users">;
		email: string;
		name: string;
		pending: {
			id: Id<"joinRequests">;
			club: string;
			state: "pending" | "approved" | "declined";
		}[];
		owner: boolean;
		transferTargets: { id: Id<"users">; name: string }[];
		mustTransfer: boolean;
		hasPassword: boolean;
	} | null> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const user = await ctx.db.get(userId);
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		const club = membership ? await ctx.db.get(membership.clubId) : undefined;
		const members = membership
			? await ctx.db
					.query("memberships")
					.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
					.collect()
			: [];
		const requests = await ctx.db
			.query("joinRequests")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		const password = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) =>
				q.eq("userId", userId).eq("provider", "password"),
			)
			.first();
		return {
			hasPassword: Boolean(password?.secret && password.emailVerified),
			id: userId,
			email: user?.email?.trim().toLowerCase() ?? "",
			name: user?.name ?? "Member",
			pending: await Promise.all(
				requests.map(async (row) => ({
					id: row._id,
					club: (await ctx.db.get(row.clubId))?.name ?? "Club unavailable",
					state: row.state,
				})),
			),
			owner: club?.ownerId === userId,
			mustTransfer: club?.ownerId === userId && members.length > 1,
			transferTargets: members
				.filter((entry) => entry.admin && entry.userId !== userId)
				.map((entry) => ({ id: entry.userId, name: entry.name })),
		};
	},
});
export const updateName = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		if (!name.trim() || name.length > 80)
			throw new Error("Use a name under 80 characters.");
		await ctx.db.patch(userId, { name: name.trim() });
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (membership) {
			await ctx.db.patch(membership._id, { name: name.trim() });
			const person = await ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", membership.clubId).eq("value.id", membership.personId),
				)
				.unique();
			if (person)
				await ctx.db.patch(person._id, {
					value: { ...person.value, name: name.trim() },
				});
		}
	},
});
export const declineRequest = mutation({
	args: { requestId: v.id("joinRequests") },
	handler: async (ctx, { requestId }): Promise<void> => {
		const member = await requireMember(ctx);
		const request = await ctx.db.get(requestId);
		if (
			!member.admin ||
			request?.clubId !== member.clubId ||
			request.state !== "pending"
		)
			throw new Error("Request unavailable.");
		await ctx.db.patch(requestId, { state: "declined" });
	},
});
export const cancelRequest = mutation({
	args: { requestId: v.id("joinRequests") },
	handler: async (ctx, { requestId }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		const request = await ctx.db.get(requestId);
		if (!userId || request?.userId !== userId)
			throw new Error("Request unavailable.");
		await ctx.db.delete(requestId);
	},
});
export const signOutOthers = mutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		if (!userId) throw new Error("Sign in first.");
		const sessions = await ctx.db
			.query("authSessions")
			.withIndex("userId", (q) => q.eq("userId", userId))
			.collect();
		for (const session of sessions.filter((row) => row._id !== sessionId)) {
			for (const token of await ctx.db
				.query("authRefreshTokens")
				.withIndex("sessionId", (q) => q.eq("sessionId", session._id))
				.collect())
				await ctx.db.delete(token._id);
			await ctx.db.delete(session._id);
		}
		const devices = await ctx.db
			.query("pushDevices")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const device of devices.filter((row) => row.sessionId !== sessionId))
			await ctx.db.delete(device._id);
	},
});
export const remove = internalMutation({
	args: {
		userId: v.id("users"),
		transferTo: v.optional(v.id("users")),
		requireVerification: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ userId, transferTo, requireVerification },
	): Promise<void> => {
		if ((await getAuthUserId(ctx)) !== userId)
			throw new Error("Sign in again to delete your account.");
		if (requireVerification && !(await recentVerification(ctx)))
			throw new Error(
				"Verify your identity again before deleting your account.",
			);
		await eraseAccount(ctx, userId, transferTo);
	},
});
