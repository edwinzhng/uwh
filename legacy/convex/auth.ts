import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

// True if the email belongs to a coach (via coaches -> players). Case-insensitive.
const isCoachEmail = async (
	ctx: MutationCtx,
	email: string,
): Promise<boolean> => {
	const normalized = email.toLowerCase();
	const coaches = await ctx.db.query("coaches").collect();
	for (const coach of coaches) {
		const player = await ctx.db.get(coach.playerId);
		if (player?.email?.toLowerCase() === normalized) {
			return true;
		}
	}
	return false;
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
	callbacks: {
		// Only allow sign-in for coach emails; throwing aborts before a session is created.
		async createOrUpdateUser(ctx, args) {
			const email = args.profile.email;
			if (!email) {
				throw new Error("Google account did not provide an email");
			}
			if (!(await isCoachEmail(ctx, email))) {
				throw new Error("This email is not authorized. Coaches only.");
			}

			if (args.existingUserId) {
				return args.existingUserId;
			}

			return ctx.db.insert("users", {
				email,
				name: args.profile.name,
				image: args.profile.image,
			});
		},
	},
});
