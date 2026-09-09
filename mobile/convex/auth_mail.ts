import type { MutationCtx } from "./_generated/server";

export const requireLocalEmail = (email: string): void => {
	if (
		process.env.AUTH_EMAIL_MODE !== "local" ||
		!/^http:\/\/(127\.0\.0\.1|localhost):/.test(
			process.env.CONVEX_CLOUD_URL ?? "",
		) ||
		!email.endsWith("@example.test")
	)
		throw new Error("Email delivery isn’t configured for this address.");
};

export const reserveAuthEmail = async (
	ctx: MutationCtx,
	email: string,
): Promise<void> => {
	if (process.env.AUTH_EMAIL_MODE === "local") requireLocalEmail(email);
	else if (!process.env.AUTH_RESEND_KEY || !process.env.AUTH_EMAIL_FROM)
		throw new Error("Email delivery isn’t configured yet.");
	const previous = await ctx.db
		.query("mailLimits")
		.withIndex("by_email", (q) => q.eq("email", email))
		.unique();
	if (previous && Date.now() - previous.sentAt < 60000)
		throw new Error("Wait a minute before requesting another code.");
	if (previous) await ctx.db.patch(previous._id, { sentAt: Date.now() });
	else await ctx.db.insert("mailLimits", { email, sentAt: Date.now() });
};
