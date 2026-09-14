import { inviteCooldown, inviteEmail } from "../src/domain/invitations";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";
import { requireMember } from "./identity";

export const inviteAdmin = async (
	ctx: QueryCtx,
): Promise<Doc<"memberships">> => {
	const member = await requireMember(ctx);
	if (!member.admin) throw new Error("Administrator access required.");
	return member;
};

export const inviteSite = (email: string): string => {
	inviteEmail(email);
	const local = process.env.AUTH_EMAIL_MODE === "local";
	if (local) requireLocalEmail(email);
	else if (!process.env.AUTH_RESEND_KEY || !process.env.AUTH_EMAIL_FROM)
		throw new Error("Email delivery isn’t configured yet.");
	const site = process.env.SITE_URL;
	if (!site || !URL.canParse(site))
		throw new Error("The club signup URL isn’t configured yet.");
	const url = new URL(site);
	if (
		url.username ||
		url.password ||
		(local
			? url.protocol !== "http:" ||
				!["localhost", "127.0.0.1"].includes(url.hostname)
			: url.protocol !== "https:" ||
				["localhost", "127.0.0.1"].includes(url.hostname))
	)
		throw new Error("Use a public HTTPS signup URL for email invites.");
	return url.origin;
};

export const reserveInvite = async (
	ctx: MutationCtx,
	actor: Doc<"memberships">,
	email: string,
): Promise<void> => {
	for (const window of [
		{
			key: `email:${email}`,
			duration: inviteCooldown,
			limit: 1,
			error: "Wait a minute before sending another invite.",
		},
		{
			key: "club",
			duration: 3600000,
			limit: 50,
			error: "Invite limit reached. Try again in an hour.",
		},
	]) {
		const previous = await ctx.db
			.query("inviteLimits")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", actor.clubId).eq("key", window.key),
			)
			.unique();
		const active = previous && Date.now() - previous.since < window.duration;
		if (active && previous.count >= window.limit) throw new Error(window.error);
		const value = {
			clubId: actor.clubId,
			key: window.key,
			since: active ? previous.since : Date.now(),
			count: active ? previous.count + 1 : 1,
		};
		if (previous) await ctx.db.replace(previous._id, value);
		else await ctx.db.insert("inviteLimits", value);
	}
};

export const unlinkedPerson = async (
	ctx: QueryCtx,
	clubId: Doc<"memberships">["clubId"],
	personId: string,
): Promise<Doc<"members">> => {
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", personId),
		)
		.unique();
	const linked = await ctx.db
		.query("memberships")
		.withIndex("by_person", (q) =>
			q.eq("clubId", clubId).eq("personId", personId),
		)
		.first();
	if (!person || linked)
		throw new Error("This profile is unavailable or already has an account.");
	return person;
};
