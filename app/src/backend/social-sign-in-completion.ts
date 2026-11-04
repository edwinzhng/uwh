import type { SocialProvider } from "../domain/social-auth";

type Dependencies = {
	readAttempt: () => Promise<{ provider: SocialProvider; path: string }>;
	exchange: (
		provider: SocialProvider,
		code: string,
	) => Promise<{ signingIn: boolean }>;
	clearAttempt: () => Promise<void>;
};

export const createSocialSignInCompletion = ({
	readAttempt,
	exchange,
	clearAttempt,
}: Dependencies): ((code: string) => Promise<string>) => {
	const attempts = new Map<string, Promise<string>>();
	return (code): Promise<string> => {
		const previous = attempts.get(code);
		if (previous) return previous;
		const result = (async (): Promise<string> => {
			if (!code) throw new Error("Sign-in wasn’t completed. Please try again.");
			const attempt = await readAttempt();
			const session = await exchange(attempt.provider, code);
			if (!session.signingIn)
				throw new Error("Sign-in wasn’t completed. Please try again.");
			await clearAttempt();
			return attempt.path;
		})();
		attempts.set(code, result);
		return result;
	};
};

export const completeNativeSocialSignIn = async ({
	callback,
	complete,
	cancel,
}: {
	callback?: string;
	complete: (code: string) => Promise<string>;
	cancel: () => Promise<void>;
}): Promise<string | undefined> => {
	if (!callback) {
		await cancel();
		return undefined;
	}
	const url = new URL(callback);
	if (
		url.protocol !== "uwh-club:" ||
		url.hostname !== "auth-callback" ||
		(url.pathname !== "" && url.pathname !== "/") ||
		url.username ||
		url.password
	)
		throw new Error("Invalid sign-in return address.");
	const code = url.searchParams.get("code");
	if (!code) throw new Error("Sign-in wasn’t completed. Please try again.");
	return complete(code);
};
