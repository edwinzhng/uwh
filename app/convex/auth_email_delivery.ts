import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

export const deliverAuthEmail = async (
	ctx: ActionCtx | undefined,
	{
		email,
		token,
		purpose,
		url,
	}: {
		email: string;
		token: string;
		purpose: "verify" | "reset" | "sign-in";
		url?: string;
	},
): Promise<void> => {
	if (!ctx) throw new Error("Email delivery unavailable.");
	if (process.env.AUTH_EMAIL_MODE === "local") {
		await ctx.runMutation(internal.local_email.save, {
			email,
			purpose,
			code: token,
		});
		return;
	}
	if (process.env.OUTBOUND_DELIVERY_DISABLED === "true")
		throw new Error("Outbound email is disabled on this development backend.");
	const key = process.env.AUTH_RESEND_KEY;
	const from = process.env.AUTH_EMAIL_FROM;
	if (!key || !from) throw new Error("Email delivery isn’t configured yet.");
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
				purpose === "sign-in"
					? "Your UWH Club sign-in link"
					: purpose === "verify"
						? "Verify your UWH Club email"
						: "Reset your UWH Club password",
			text:
				purpose === "sign-in"
					? `Sign in to UWH Club:\n\n${url}\n\nThis link works once and expires in 10 minutes. If you didn’t request it, ignore this email.`
					: `Your code is ${token}. It expires in 10 minutes. If you didn’t request this, ignore this email.`,
		}),
	});
	if (!response.ok)
		throw new Error("Couldn’t send your email. Try again shortly.");
};
