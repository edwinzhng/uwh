import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

// Returns true if the given email belongs to a coach (matched via the
// coaches -> players relationship). Comparison is case-insensitive.
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
		// Only allow sign-in for emails that belong to a coach. Throwing here
		// aborts the sign-in before any session is created.
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
