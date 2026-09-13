import Apple from "@auth/core/providers/apple";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { authRedirect } from "../src/domain/social-auth";
import { authEmail } from "./auth_email";
import { withPasswordErrors } from "./auth_errors";
import { saveAuthUser } from "./auth_users";
import { socialEnabled } from "./social_config";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	callbacks: {
		createOrUpdateUser: saveAuthUser,
		redirect: async ({ redirectTo }): Promise<string> =>
			authRedirect(redirectTo, process.env.SITE_URL ?? ""),
	},
	providers: [
		...(socialEnabled("google")
			? [
					Google({
						allowDangerousEmailAccountLinking: false,
						authorization: { params: { prompt: "select_account" } },
						profile: (profile) => ({
							id: profile.sub,
							email: profile.email?.trim().toLowerCase(),
							emailVerified: profile.email_verified === true,
							name: profile.name,
						}),
					}),
				]
			: []),
		...(socialEnabled("apple")
			? [
					Apple({
						allowDangerousEmailAccountLinking: false,
						profile: (profile) => ({
							id: profile.sub,
							email: profile.email?.trim().toLowerCase(),
							emailVerified:
								profile.email_verified === true ||
								profile.email_verified === "true",
							...(profile.user?.name
								? {
										name: [
											profile.user.name.firstName,
											profile.user.name.lastName,
										]
											.filter(Boolean)
											.join(" "),
									}
								: {}),
						}),
					}),
				]
			: []),
		withPasswordErrors(
			Password({
				verify: authEmail("verify"),
				reset: authEmail("reset"),
				profile: (params): { email: string; name: string } => {
					const email =
						typeof params.email === "string"
							? params.email.trim().toLowerCase()
							: "";
					const name =
						typeof params.name === "string"
							? params.name.trim()
							: (email.split("@").at(0) ?? "Member");
					if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
						throw new Error("Enter a valid email.");
					if (name.length > 80)
						throw new Error("Use a name under 80 characters.");
					params.email = email;
					return { email, name };
				},
				validatePasswordRequirements: (password): void => {
					if (typeof password !== "string" || password.length < 12)
						throw new Error("Use at least 12 characters.");
					if (password.length > 256)
						throw new Error("Use no more than 256 characters.");
				},
			}),
		),
	],
});
