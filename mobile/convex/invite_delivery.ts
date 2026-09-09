import { v } from "convex/values";
import { inviteState, inviteUrl } from "../src/domain/invitations";
import { internal } from "./_generated/api";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { inviteDelivery } from "./invite_schema";

export const pending = internalQuery({
	args: { id: v.id("clubInvites"), revision: v.number() },
	handler: async (
		ctx,
		{ id, revision },
	): Promise<{ email: string; clubName: string; url: string } | null> => {
		const invite = await ctx.db.get(id);
		if (
			!invite ||
			inviteState(invite, revision, Date.now()) !== "pending" ||
			invite.delivery !== "queued"
		)
			return null;
		const club = await ctx.db.get(invite.clubId);
		const createdBy = invite.createdBy;
		const actor = createdBy
			? await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", createdBy))
					.first()
			: undefined;
		return club && actor?.admin && actor.clubId === invite.clubId
			? {
					email: invite.email,
					clubName: club.name,
					url: inviteUrl(invite.siteUrl, id, revision),
				}
			: null;
	},
});

export const finish = internalMutation({
	args: {
		id: v.id("clubInvites"),
		revision: v.number(),
		delivery: inviteDelivery,
	},
	handler: async (ctx, { id, revision, delivery }): Promise<void> => {
		const invite = await ctx.db.get(id);
		if (
			invite?.revision === revision &&
			invite.state === "pending" &&
			(delivery !== "failed" || invite.delivery === "queued")
		)
			await ctx.db.patch(id, { delivery });
	},
});

export const send = internalAction({
	args: { id: v.id("clubInvites"), revision: v.number() },
	handler: async (ctx, args): Promise<void> => {
		const mail = await ctx.runQuery(internal.invite_delivery.pending, args);
		if (!mail) {
			await ctx.runMutation(internal.invite_delivery.finish, {
				...args,
				delivery: "failed",
			});
			return;
		}
		try {
			if (process.env.AUTH_EMAIL_MODE === "local") {
				await ctx.runMutation(internal.local_email.save, {
					email: mail.email,
					purpose: "invite",
					code: mail.url,
				});
				await ctx.runMutation(internal.invite_delivery.finish, {
					...args,
					delivery: "local",
				});
				return;
			}
			const key = process.env.AUTH_RESEND_KEY;
			const from = process.env.AUTH_EMAIL_FROM;
			if (!key || !from) throw new Error("Email unavailable");
			const response = await fetch("https://api.resend.com/emails", {
				method: "POST",
				signal: AbortSignal.timeout(15000),
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
					"Idempotency-Key": `club-invite/${args.id}/${args.revision}`,
				},
				body: JSON.stringify({
					from,
					to: [mail.email],
					subject: `Join ${mail.clubName}`,
					text: `You’re invited to join ${mail.clubName}.\n\nCreate an account or sign in with ${mail.email}:\n${mail.url}\n\nThis invitation expires in 7 days. If you weren’t expecting it, you can ignore this email.`,
				}),
			});
			if (!response.ok) throw new Error("Email failed");
			await ctx.runMutation(internal.invite_delivery.finish, {
				...args,
				delivery: "sent",
			});
		} catch {
			await ctx.runMutation(internal.invite_delivery.finish, {
				...args,
				delivery: "failed",
			});
		}
	},
});
