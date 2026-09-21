import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppAction } from "../src/domain/app-types";
import {
	inviteEmail,
	inviteLifetime,
	inviteState,
	inviteUrl,
} from "../src/domain/invitations";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ownsVerifiedEmail } from "./account_emails";
import { actionData } from "./action_data";
import { saveData } from "./data";
import { accountFor, getAuthUserId, memberFor } from "./identity";
import {
	inviteAdmin,
	inviteSite,
	reserveInvite,
	unlinkedPerson,
} from "./invite_helpers";
import { claimPendingMessages } from "./pending_messages";

type InviteSummary = {
	id: Id<"clubInvites">;
	name: string;
	email: string;
	state: ReturnType<typeof inviteState>;
	delivery: Doc<"clubInvites">["delivery"];
	expiresAt: number;
	lastSentAt: number;
	url: string;
};
type InvitePreview = {
	clubName: string;
	state: ReturnType<typeof inviteState>;
	matchesEmail: boolean;
	acceptedByYou: boolean;
};
const acceptInviteForUser = async (
	ctx: MutationCtx,
	invite: Doc<"clubInvites">,
	userId: Id<"users">,
	revision: number,
): Promise<Id<"clubs">> => {
	const user = await ctx.db.get(userId);
	const existing = await memberFor(ctx);
	const state = inviteState(invite, revision, Date.now());
	if (
		state === "accepted" &&
		invite.acceptedBy === userId &&
		existing?.clubId === invite.clubId
	)
		return invite.clubId;
	if (state !== "pending" || !(await ctx.db.get(invite.clubId)))
		throw new Error(
			"This invite is no longer available. Ask an admin for a new one.",
		);
	if (existing)
		throw new Error(
			"This account already belongs to a club. Sign in with a different account.",
		);
	const person = await unlinkedPerson(ctx, invite.clubId, invite.personId);
	const membershipId = await ctx.db.insert("memberships", {
		clubId: invite.clubId,
		userId,
		name: user?.name ?? person.value.name,
		personId: invite.personId,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await claimPendingMessages(ctx, membershipId);
	const channels = await ctx.db
		.query("conversations")
		.withIndex("by_club", (q) => q.eq("clubId", invite.clubId))
		.collect();
	for (const channel of channels.filter(
		(channel) =>
			channel.value.id === "club" ||
			(channel.value.id === "youth" && person.value.programs.includes("youth")),
	))
		await ctx.db.patch(channel._id, {
			value: {
				...channel.value,
				accountIds: [...new Set([...channel.value.accountIds, userId])],
			},
		});
	const requests = await ctx.db
		.query("joinRequests")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();
	for (const request of requests.filter(
		(request) =>
			request.clubId === invite.clubId && request.state === "pending",
	))
		await ctx.db.patch(request._id, { state: "approved" });
	await ctx.db.patch(invite._id, { state: "accepted", acceptedBy: userId });
	return invite.clubId;
};

export const create = mutation({
	args: {
		email: v.string(),
		profile: v.union(
			v.object({ personId: v.string() }),
			v.object({
				id: v.string(),
				name: v.string(),
				player: v.boolean(),
				charge: v.number(),
			}),
		),
	},
	handler: async (
		ctx,
		{ email: rawEmail, profile },
	): Promise<Id<"clubInvites">> => {
		const actor = await inviteAdmin(ctx);
		const email = inviteEmail(rawEmail);
		const siteUrl = inviteSite(email);
		const users = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", email))
			.collect();
		for (const user of users) {
			if (
				await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", user._id))
					.first()
			)
				throw new Error("This email already belongs to a club account.");
		}
		const personId = "personId" in profile ? profile.personId : profile.id;
		const previous = await ctx.db
			.query("clubInvites")
			.withIndex("by_club_email", (q) =>
				q.eq("clubId", actor.clubId).eq("email", email),
			)
			.order("desc")
			.first();
		if (previous?.state === "pending" && previous.expiresAt > Date.now()) {
			if (previous.personId === personId) return previous._id;
			throw new Error("An invite is already pending for this email.");
		}
		await reserveInvite(ctx, actor, email);
		const profileInvites = await ctx.db
			.query("clubInvites")
			.withIndex("by_person", (q) =>
				q.eq("clubId", actor.clubId).eq("personId", personId),
			)
			.collect();
		if (
			profileInvites.some(
				(invite) => invite.state === "pending" && invite.expiresAt > Date.now(),
			)
		)
			throw new Error("This profile already has a pending invite.");
		if (!("personId" in profile)) {
			if (
				!profile.name.trim() ||
				profile.name.length > 80 ||
				!personId ||
				personId.length > 100
			)
				throw new Error("Check the member name.");
			const existing = await ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", personId),
				)
				.unique();
			if (existing)
				throw new Error(
					"This member already exists. Invite them from their profile.",
				);
			const action: AppAction = {
				type: "add-member",
				member: {
					id: personId,
					name: profile.name.trim(),
					programs: profile.player ? ["club"] : [],
					position: profile.player ? "Player" : "Member",
					rating: 3,
					registration: "missing",
					goal: "",
					steps: 0,
				},
				charge: profile.charge,
			};
			const { data, rows } = await actionData(ctx, actor.clubId, action);
			await saveData(
				ctx,
				actor.clubId,
				rows,
				reduceApp(data, accountFor(actor), action),
			);
		}
		await unlinkedPerson(ctx, actor.clubId, personId);
		const id = await ctx.db.insert("clubInvites", {
			clubId: actor.clubId,
			personId,
			email,
			createdBy: actor.userId,
			revision: 1,
			expiresAt: Date.now() + inviteLifetime,
			lastSentAt: Date.now(),
			state: "pending",
			delivery: "queued",
			siteUrl,
		});
		await ctx.scheduler.runAfter(0, internal.invite_delivery.send, {
			id,
			revision: 1,
		});
		return id;
	},
});

export const list = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ paginationOpts },
	): Promise<PaginationResult<InviteSummary>> => {
		const actor = await inviteAdmin(ctx);
		const result = await ctx.db
			.query("clubInvites")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.order("desc")
			.paginate({
				...paginationOpts,
				numItems: Math.min(paginationOpts.numItems, 50),
			});
		return {
			...result,
			page: await Promise.all(
				result.page.map(async (invite) => {
					const member = await ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", actor.clubId).eq("value.id", invite.personId),
						)
						.unique();
					return {
						id: invite._id,
						name: member?.value.name ?? "Former member",
						email: invite.email,
						state: inviteState(invite, invite.revision, Date.now()),
						delivery: invite.delivery,
						expiresAt: invite.expiresAt,
						lastSentAt: invite.lastSentAt,
						url: inviteUrl(invite.siteUrl, invite._id, invite.revision),
					};
				}),
			),
		};
	},
});

export const resend = mutation({
	args: { id: v.id("clubInvites") },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await inviteAdmin(ctx);
		const invite = await ctx.db.get(id);
		if (!invite || invite.clubId !== actor.clubId || invite.state !== "pending")
			throw new Error("Invite unavailable.");
		await unlinkedPerson(ctx, actor.clubId, invite.personId);
		const siteUrl = inviteSite(invite.email);
		await reserveInvite(ctx, actor, invite.email);
		const revision = invite.revision + 1;
		await ctx.db.patch(id, {
			revision,
			siteUrl,
			createdBy: actor.userId,
			delivery: "queued",
			lastSentAt: Date.now(),
			expiresAt: Date.now() + inviteLifetime,
		});
		await ctx.scheduler.runAfter(0, internal.invite_delivery.send, {
			id,
			revision,
		});
	},
});

export const revoke = mutation({
	args: { id: v.id("clubInvites") },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await inviteAdmin(ctx);
		const invite = await ctx.db.get(id);
		if (
			!invite ||
			invite.clubId !== actor.clubId ||
			invite.state === "accepted"
		)
			throw new Error("Invite unavailable.");
		await ctx.db.patch(id, { state: "revoked" });
	},
});

export const preview = query({
	args: { invite: v.string(), revision: v.number() },
	handler: async (
		ctx,
		{ invite: reference, revision },
	): Promise<InvitePreview | null> => {
		const id = ctx.db.normalizeId("clubInvites", reference);
		const invite = id ? await ctx.db.get(id) : undefined;
		const club = invite ? await ctx.db.get(invite.clubId) : undefined;
		if (!invite || !club) return null;
		const userId = await getAuthUserId(ctx);
		return {
			clubName: club.name,
			state: inviteState(invite, revision, Date.now()),
			matchesEmail: userId
				? await ownsVerifiedEmail(ctx, userId, invite.email)
				: false,
			acceptedByYou: Boolean(userId && invite.acceptedBy === userId),
		};
	},
});

export const accept = mutation({
	args: { invite: v.string(), revision: v.number() },
	handler: async (
		ctx,
		{ invite: reference, revision },
	): Promise<Id<"clubs">> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in and verify your email first.");
		const id = ctx.db.normalizeId("clubInvites", reference);
		const invite = id ? await ctx.db.get(id) : undefined;
		if (!invite || !(await ownsVerifiedEmail(ctx, userId, invite.email)))
			throw new Error(
				"Sign in with the email address that received this invite.",
			);
		return acceptInviteForUser(ctx, invite, userId, revision);
	},
});

export const acceptPendingForCurrentUser = mutation({
	args: {},
	handler: async (ctx): Promise<Id<"clubs"> | null> => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await memberFor(ctx))) return null;
		const user = await ctx.db.get(userId);
		const accounts = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
			.collect();
		const emails = [
			...(user?.emailVerificationTime && user.email ? [user.email] : []),
			...accounts.flatMap((account) =>
				account.emailVerified ? [account.emailVerified] : [],
			),
		].map((email) => email.trim().toLowerCase());
		const invites = (
			await Promise.all(
				[...new Set(emails)].map((email) =>
					ctx.db
						.query("clubInvites")
						.withIndex("by_email", (q) => q.eq("email", email))
						.order("desc")
						.collect(),
				),
			)
		)
			.flat()
			.filter(
				(invite) => invite.state === "pending" && invite.expiresAt > Date.now(),
			)
			.sort((a, b) => b._creationTime - a._creationTime);
		const invite = invites.at(0);
		return invite
			? acceptInviteForUser(ctx, invite, userId, invite.revision)
			: null;
	},
});
