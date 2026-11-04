import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString } from "@oslojs/crypto/random";
import type { ActionCtx } from "./_generated/server";
import { deliverAuthEmail } from "./auth_email_delivery";

export const authEmail = (
	purpose: "verify" | "reset",
): ReturnType<typeof Email> =>
	Email({
		id: `email-${purpose}`,
		maxAge: 600,
		authorize: async (params, account): Promise<void> => {
			if (
				typeof params.email !== "string" ||
				params.email.trim().toLowerCase() !== account.providerAccountId
			)
				throw new Error("Check your email and code.");
		},
		generateVerificationToken: async (): Promise<string> =>
			generateRandomString(
				{
					read: (bytes): void => {
						crypto.getRandomValues(bytes);
					},
				},
				"0123456789",
				6,
			),
		sendVerificationRequest: async (
			{ identifier, token },
			ctx?: ActionCtx,
		): Promise<void> => {
			await deliverAuthEmail(ctx, {
				email: identifier.trim().toLowerCase(),
				token,
				purpose,
			});
		},
	});

export const authSignInEmail = (): ReturnType<typeof Email> =>
	Email({
		id: "email-link",
		maxAge: 600,
		authorize: undefined,
		sendVerificationRequest: async (
			{ identifier, token, url },
			ctx?: ActionCtx,
		): Promise<void> =>
			deliverAuthEmail(ctx, {
				email: identifier.trim().toLowerCase(),
				token,
				url,
				purpose: "sign-in",
			}),
	});

export const authSignInCode = (): ReturnType<typeof Email> =>
	Email({
		id: "email-code",
		maxAge: 600,
		generateVerificationToken: async (): Promise<string> =>
			generateRandomString(
				{
					read: (bytes): void => {
						crypto.getRandomValues(bytes);
					},
				},
				"0123456789",
				6,
			),
		sendVerificationRequest: async (
			{ identifier, token },
			ctx?: ActionCtx,
		): Promise<void> =>
			deliverAuthEmail(ctx, {
				email: identifier.trim().toLowerCase(),
				token,
				purpose: "sign-in-code",
			}),
	});
