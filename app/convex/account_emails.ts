import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const ownsVerifiedEmail = async (
	ctx: QueryCtx,
	userId: Id<"users">,
	email: string,
): Promise<boolean> => {
	const user = await ctx.db.get(userId);
	if (user?.emailVerificationTime && user.email?.trim().toLowerCase() === email)
		return true;
	const accounts = await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
		.collect();
	return accounts.some(
		(account) => account.emailVerified?.trim().toLowerCase() === email,
	);
};
