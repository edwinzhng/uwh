import { v } from "convex/values";
import type { GroupCreation } from "../src/domain/group-conversation";
import { staffRoomId } from "../src/domain/managed-rooms";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

const fixtureArgs = { clubId: v.id("clubs"), userId: v.id("users") };
const requireFixture = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	userId: Id<"users">,
): Promise<void> => {
	const [club, user] = await Promise.all([
		ctx.db.get(clubId),
		ctx.db.get(userId),
	]);
	requireLocalEmail(user?.email ?? "");
	if (
		!user?.email?.startsWith("named-groups-") ||
		club?.ownerId !== userId ||
		club.name !== "Named group verification" ||
		process.env.PUSH_DELIVERY_ENABLED === "true"
	)
		throw new Error("Isolated fictional group fixture required.");
};
export const seedStaff = internalMutation({
	args: fixtureArgs,
	handler: async (ctx, { clubId, userId }): Promise<void> => {
		await requireFixture(ctx, clubId, userId);
		const previous = await ctx.db
			.query("conversations")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", staffRoomId),
			)
			.unique();
		if (previous) throw new Error("Staff must not be created automatically.");
		const accounts = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(20);
		await ctx.db.insert("conversations", {
			clubId,
			value: {
				id: staffRoomId,
				title: "Staff",
				subtitle: "Historical private staff room",
				accountIds: accounts.map((account) => account.userId),
			},
		});
		await ctx.db.insert("messages", {
			clubId,
			value: {
				id: "retired-staff-message",
				threadId: staffRoomId,
				accountId: userId,
				author: "Fictional historical author",
				time: "Now",
				body: "Preserved fictional Staff history",
			},
		});
	},
});
export const pause = internalMutation({
	args: { ...fixtureArgs, targetId: v.id("users"), paused: v.boolean() },
	handler: async (ctx, { clubId, userId, targetId, paused }): Promise<void> => {
		await requireFixture(ctx, clubId, userId);
		const [user, target] = await Promise.all([
			ctx.db.get(targetId),
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", targetId))
				.first(),
		]);
		requireLocalEmail(user?.email ?? "");
		if (!user?.email?.startsWith("named-groups-") || target?.clubId !== clubId)
			throw new Error("Fictional club member required.");
		const previous = await ctx.db
			.query("chatRestrictions")
			.withIndex("by_user", (q) => q.eq("userId", targetId))
			.first();
		if (!paused && previous) await ctx.db.delete(previous._id);
		if (paused && !previous)
			await ctx.db.insert("chatRestrictions", {
				clubId,
				userId: targetId,
				moderatorId: userId,
				createdAt: Date.now(),
			});
	},
});
export const seedLegacyParticipant = internalMutation({
	args: { ...fixtureArgs, threadId: v.string(), targetId: v.id("users") },
	handler: async (
		ctx,
		{ clubId, userId, threadId, targetId },
	): Promise<string> => {
		await requireFixture(ctx, clubId, userId);
		const [target, thread] = await Promise.all([
			ctx.db.get(targetId),
			ctx.db
				.query("conversations")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", threadId),
				)
				.unique(),
		]);
		requireLocalEmail(target?.email ?? "");
		if (
			!target?.email?.startsWith("named-groups-") ||
			!thread?.value.accountIds.includes(targetId)
		)
			throw new Error("Fictional conversation participant required.");
		await ctx.db.patch(thread._id, {
			value: {
				...thread.value,
				participantPersonIds: [
					...(thread.value.participantPersonIds ?? []),
					targetId,
				],
			},
		});
		const legacyId = `${threadId}-legacy-raw`;
		await ctx.db.insert("conversations", {
			clubId,
			value: {
				id: legacyId,
				title: "Fictional legacy metadata",
				subtitle: "Group conversation",
				kind: "group",
				accountIds: [userId],
				participantPersonIds: [targetId],
			},
		});
		return legacyId;
	},
});
export const detachRoster = internalMutation({
	args: { ...fixtureArgs, targetId: v.id("users") },
	handler: async (ctx, { clubId, userId, targetId }): Promise<void> => {
		await requireFixture(ctx, clubId, userId);
		const [target, membership] = await Promise.all([
			ctx.db.get(targetId),
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", targetId))
				.first(),
		]);
		requireLocalEmail(target?.email ?? "");
		if (
			!target?.email?.startsWith("named-groups-") ||
			membership?.clubId !== clubId ||
			targetId === userId
		)
			throw new Error("Fictional non-owner club member required.");
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", membership.personId),
			)
			.unique();
		if (person) await ctx.db.delete(person._id);
		await ctx.db.patch(membership._id, { personId: targetId });
	},
});
export type GroupInspection = {
	threads: {
		id: string;
		accountIds: string[];
		personIds: string[];
		creator?: string;
		conversionRecipients?: string[];
		receipt?: GroupCreation;
		direct: boolean;
		messages: string[];
	}[];
};
export const inspect = internalQuery({
	args: fixtureArgs,
	handler: async (ctx, { clubId, userId }): Promise<GroupInspection> => {
		await requireFixture(ctx, clubId, userId);
		const [threads, messages] = await Promise.all([
			ctx.db
				.query("conversations")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
			ctx.db
				.query("messages")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.take(100),
		]);
		return {
			threads: threads.map((thread) => ({
				id: thread.value.id,
				accountIds: thread.value.accountIds,
				personIds: [
					...new Set([
						...(thread.value.participantPersonIds ?? []),
						...(thread.pendingPersonIds ?? []),
					]),
				],
				creator: thread.groupCreatorId,
				conversionRecipients: thread.groupSourceRecipientIds,
				receipt: thread.groupCreation,
				direct: Boolean(thread.directKey),
				messages: messages
					.filter((message) => message.value.threadId === thread.value.id)
					.map((message) => message.value.body),
			})),
		};
	},
});
