import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { reserveAuthEmail } from "./auth_mail";

export const saveAuthUser = async (
	ctx: MutationCtx,
	args: {
		existingUserId: Id<"users"> | null;
		type: string;
		profile: { email?: string; emailVerified?: boolean; name?: unknown };
	},
): Promise<Id<"users">> => {
	const email = args.profile.email?.trim().toLowerCase();
	if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		throw new Error("A verified email address is required.");
	if (args.type === "oauth" && args.profile.emailVerified !== true)
		throw new Error("Verify your email with your sign-in provider first.");
	if (args.type === "email") await reserveAuthEmail(ctx, email);
	const matches = args.existingUserId
		? []
		: await ctx.db
				.query("users")
				.withIndex("email", (q) => q.eq("email", email))
				.filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
				.take(2);
	if (matches.length > 1)
		throw new Error(
			"Sign in to your existing account to connect this provider.",
		);
	const existingId = args.existingUserId ?? matches.at(0)?._id;
	if (existingId) {
		const user = await ctx.db.get(existingId);
		if (!user) throw new Error("Account unavailable.");
		if (args.profile.emailVerified === true && user.email === email)
			await ctx.db.patch(existingId, {
				emailVerificationTime: user.emailVerificationTime ?? Date.now(),
			});
		return existingId;
	}
	return ctx.db.insert("users", {
		email,
		name:
			typeof args.profile.name === "string" && args.profile.name.trim()
				? args.profile.name.trim().slice(0, 80)
				: (email.split("@").at(0) ?? "Member"),
		...(args.profile.emailVerified === true
			? { emailVerificationTime: Date.now() }
			: {}),
	});
};
