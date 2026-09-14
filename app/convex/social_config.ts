import type { SocialProvider } from "../src/domain/social-auth";

export const socialEnabled = (provider: SocialProvider): boolean =>
	provider === "google"
		? Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
		: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
