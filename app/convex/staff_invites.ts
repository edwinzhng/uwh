import { sha256 } from "@oslojs/crypto/sha2";
import { v } from "convex/values";
import { clubPrograms } from "../src/domain/programs";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
type StaffInviteList = {
	canGrantAdmin: boolean;
	invites: (Pick<
		Doc<"staffInvites">,
		"admin" | "coachPrograms" | "expiresAt" | "uses" | "maxUses" | "revoked"
	> & { id: Doc<"staffInvites">["_id"] })[];
};
const hashCode = (code: string): string =>
	Array.from(sha256(new TextEncoder().encode(code)), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
const issuerAuthorized = async (
	ctx: QueryCtx,
	invite: Doc<"staffInvites">,
): Promise<boolean> => {
	const createdBy = invite.createdBy;
	const club = await ctx.db.get(invite.clubId);
	if (!createdBy) return Boolean(club && invite.ownerAtIssue === club.ownerId);
	const issuer = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", createdBy))
		.first();
	return Boolean(
		club &&
			issuer?.clubId === club._id &&
			issuer.admin &&
			(!invite.admin || club.ownerId === invite.createdBy),
	);
};
export const resolveStaffInvite = async (
	ctx: QueryCtx,
	code: string,
): Promise<Doc<"staffInvites">> => {
	const invite = await ctx.db
		.query("staffInvites")
		.withIndex("by_hash", (q) => q.eq("hash", hashCode(code)))
		.unique();
	if (
		!invite ||
		invite.revoked ||
		invite.expiresAt <= Date.now() ||
		invite.uses >= invite.maxUses ||
		!(await issuerAuthorized(ctx, invite))
	)
		throw new Error(
			"This staff invite is unavailable. Ask an admin for a new one.",
		);
	return invite;
};
export const list = query({
	args: {},
	handler: async (ctx): Promise<StaffInviteList> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const club = await ctx.db.get(actor.clubId);
		const invites = await ctx.db
			.query("staffInvites")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.order("desc")
			.take(20);
		return {
			canGrantAdmin: club?.ownerId === actor.userId,
			invites: invites.map((invite) => ({
				id: invite._id,
				admin: invite.admin,
				coachPrograms: invite.coachPrograms,
				expiresAt: invite.expiresAt,
				uses: invite.uses,
				maxUses: invite.maxUses,
				revoked: invite.revoked,
			})),
		};
	},
});
export const writeStaffInvite = async (
	ctx: MutationCtx,
	club: Doc<"clubs">,
	input: { admin: boolean; coachPrograms: string[] },
	issuer:
		| { createdBy: Id<"users">; ownerAtIssue?: never }
		| { createdBy?: never; ownerAtIssue: Id<"users"> },
): Promise<string> => {
	const programs = clubPrograms({ programs: club.programs }).filter(
		(program) => !program.archived && program.status !== "completed",
	);
	const coachPrograms = [...new Set(input.coachPrograms)];
	if (
		(!input.admin && !coachPrograms.length) ||
		coachPrograms.some((id) => !programs.some((program) => program.id === id))
	)
		throw new Error("Choose valid staff permissions.");
	const recent = await ctx.db
		.query("staffInvites")
		.withIndex("by_club", (q) => q.eq("clubId", club._id))
		.order("desc")
		.take(20);
	const active = await ctx.db
		.query("staffInvites")
		.withIndex("by_club_active_expiry", (q) =>
			q.eq("clubId", club._id).eq("revoked", false).gt("expiresAt", Date.now()),
		)
		.take(5);
	if (active.length >= 5)
		throw new Error("Revoke an unused staff invite before creating another.");
	if (
		recent.length === 20 &&
		(recent.at(-1)?._creationTime ?? 0) > Date.now() - 3600000
	)
		throw new Error("Staff invite limit reached. Try again in an hour.");
	const code = Array.from(
		{ length: 32 },
		() => alphabet.at(Math.floor(Math.random() * alphabet.length)) ?? "A",
	).join("");
	const hash = hashCode(code);
	if (
		await ctx.db
			.query("staffInvites")
			.withIndex("by_hash", (q) => q.eq("hash", hash))
			.unique()
	)
		throw new Error("Could not create a staff invite. Try again.");
	await ctx.db.insert("staffInvites", {
		clubId: club._id,
		...issuer,
		hash,
		admin: input.admin,
		coachPrograms,
		expiresAt: Date.now() + 14 * 86400000,
		uses: 0,
		maxUses: 5,
		revoked: false,
	});
	return code;
};
export const create = mutation({
	args: { admin: v.boolean(), coachPrograms: v.array(v.string()) },
	handler: async (ctx, input): Promise<string> => {
		const actor = await requireMember(ctx);
		const club = await ctx.db.get(actor.clubId);
		if (!actor.admin || !club)
			throw new Error("Administrator access required.");
		if (input.admin && club.ownerId !== actor.userId)
			throw new Error("Only the club owner can invite administrators.");
		return writeStaffInvite(ctx, club, input, { createdBy: actor.userId });
	},
});
export const revoke = mutation({
	args: { id: v.id("staffInvites") },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await requireMember(ctx);
		const invite = await ctx.db.get(id);
		if (!actor.admin || invite?.clubId !== actor.clubId)
			throw new Error("Staff invite unavailable.");
		await ctx.db.patch(id, { revoked: true });
	},
});
