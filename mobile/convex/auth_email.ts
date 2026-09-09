import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString } from "@oslojs/crypto/random";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

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
				8,
			),
		sendVerificationRequest: async (
			{ identifier, token },
			ctx?: ActionCtx,
		): Promise<void> => {
			if (!ctx) throw new Error("Email delivery unavailable.");
			const email = identifier.trim().toLowerCase();
			if (process.env.AUTH_EMAIL_MODE === "local") {
				await ctx.runMutation(internal.local_email.save, {
					email,
					purpose,
					code: token,
				});
				return;
			}
			const key = process.env.AUTH_RESEND_KEY;
			const from = process.env.AUTH_EMAIL_FROM;
			if (!key || !from)
				throw new Error("Email delivery isn’t configured yet.");
			const response = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from,
					to: [email],
					subject:
						purpose === "verify"
							? "Verify your Crocs Club email"
							: "Reset your Crocs Club password",
					text: `Your code is ${token}. It expires in 10 minutes. If you didn’t request this, ignore this email.`,
				}),
			});
			if (!response.ok)
				throw new Error("Couldn’t send your code. Try again shortly.");
		},
	});
