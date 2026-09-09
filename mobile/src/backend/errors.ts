export const friendlyError = (error: unknown): string => {
	if (!(error instanceof Error)) return "Could not save. Please try again.";
	if (/InvalidAccountId|InvalidSecret|Invalid credentials/.test(error.message))
		return "Check your email and password.";
	if (error.message.includes("Could not verify code"))
		return "That code is invalid or expired. Try again or request a new one.";
	if (error.message.includes("TooManyFailedAttempts"))
		return "Too many attempts. Try again later.";
	return (
		error.message.match(/Uncaught Error: ([^\n]+)/)?.at(1) ??
		error.message.slice(0, 180)
	);
};
