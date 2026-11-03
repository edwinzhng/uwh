import type { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

export const passwordErrorMessage = (error: unknown): string | undefined => {
	if (!(error instanceof Error)) return undefined;
	if (/InvalidAccountId|InvalidSecret|Invalid credentials/.test(error.message))
		return "Incorrect email or password.";
	if (/TooManyFailedAttempts|Too many requests|rate limit/i.test(error.message))
		return "Too many attempts. Try again later.";
	if (/Could not verify code|expired.*code|invalid.*code/i.test(error.message))
		return "Invalid or expired code. Request a new code.";
	if (
		/^(Enter a valid email\.|Use 80 characters or fewer\.|Use at least 12 characters\.|Use 256 characters or fewer\.)$/.test(
			error.message,
		)
	)
		return error.message;
	return undefined;
};

export const withPasswordErrors = (
	provider: ReturnType<typeof Password>,
): ReturnType<typeof Password> => {
	const configured = provider as ReturnType<typeof Password> & {
		options: Pick<ReturnType<typeof Password>, "authorize">;
	};
	return Object.assign({}, provider, {
		options: {
			...configured.options,
			authorize: async (
				...args: Parameters<typeof provider.authorize>
			): ReturnType<typeof provider.authorize> => {
				const [params] = args;
				try {
					return await configured.options.authorize(...args);
				} catch (error) {
					if (
						params.flow === "reset" &&
						error instanceof Error &&
						error.message.includes("InvalidAccountId")
					)
						return null;
					const message = passwordErrorMessage(error);
					if (message) throw new ConvexError(message);
					throw error;
				}
			},
		},
	});
};
