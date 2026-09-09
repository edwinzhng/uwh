import {
	isSocialProvider,
	type SocialProvider,
	signInReturnPath,
} from "../domain/social-auth";
import { connectionStorage } from "./connection-storage";

const key = "crocs_social_sign_in";
export const saveSignInAttempt = async (
	provider: SocialProvider,
	path: string,
): Promise<void> => {
	await connectionStorage.setItem(
		key,
		JSON.stringify({ provider, path, expiresAt: Date.now() + 10 * 60000 }),
	);
};
export const clearSignInAttempt = async (): Promise<void> => {
	await connectionStorage.removeItem(key);
};
export const readSignInAttempt = async (): Promise<{
	provider: SocialProvider;
	path: string;
}> => {
	const stored = await connectionStorage.getItem(key);
	const value: unknown = stored ? JSON.parse(stored) : undefined;
	if (
		typeof value !== "object" ||
		value === null ||
		!("provider" in value) ||
		typeof value.provider !== "string" ||
		!isSocialProvider(value.provider) ||
		!("path" in value) ||
		typeof value.path !== "string" ||
		!("expiresAt" in value) ||
		typeof value.expiresAt !== "number" ||
		value.expiresAt <= Date.now()
	)
		throw new Error("Sign-in expired. Please try again.");
	return { provider: value.provider, path: signInReturnPath(value.path) };
};
