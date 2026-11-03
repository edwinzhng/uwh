import { ConvexError } from "convex/values";

export const friendlyError = (error: unknown): string => {
	const fallback = "Something went wrong. Try again.";
	if (error instanceof ConvexError && typeof error.data === "string")
		return error.data;
	if (!(error instanceof Error)) return fallback;
	if (/InvalidAccountId|InvalidSecret|Invalid credentials/.test(error.message))
		return "Incorrect email or password.";
	if (error.message.includes("Could not verify code"))
		return "Invalid or expired code. Request a new code.";
	if (error.message.includes("TooManyFailedAttempts"))
		return "Too many attempts. Try again later.";
	if (
		/Failed to fetch|Network request failed|Load failed|offline/i.test(
			error.message,
		)
	)
		return "Check your internet connection and retry.";
	if (
		/\[CONVEX|\[Request ID:|Server Error|Uncaught|\n\s+at /i.test(error.message)
	)
		return fallback;
	return error.message || fallback;
};
