import { expect, test } from "bun:test";
import {
	completeNativeSocialSignIn,
	createSocialSignInCompletion,
} from "../src/backend/social-sign-in-completion";

for (const provider of ["google", "apple"] as const) {
	test(`${provider} exchanges the native callback before returning to the original invitation`, async (): Promise<void> => {
		const session = Promise.withResolvers<{ signingIn: boolean }>();
		const events: string[] = [];
		const complete = createSocialSignInCompletion({
			readAttempt: async () => ({
				provider,
				path: "/join?invite=fixture&revision=2",
			}),
			exchange: async (selected, code) => {
				events.push(`${selected}:${code}`);
				return session.promise;
			},
			clearAttempt: async (): Promise<void> => {
				events.push("cleared");
			},
		});
		const destination = completeNativeSocialSignIn({
			callback: "uwh-club://auth-callback?code=01234567",
			complete,
			cancel: async (): Promise<void> => {
				throw new Error("Unexpected cancellation");
			},
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(events).toEqual([`${provider}:01234567`]);
		session.resolve({ signingIn: true });
		expect(await destination).toBe("/join?invite=fixture&revision=2");
		expect(events).toEqual([`${provider}:01234567`, "cleared"]);
	});
}

test("the browser result and a simultaneous deep link redeem one code only once", async (): Promise<void> => {
	const session = Promise.withResolvers<{ signingIn: boolean }>();
	const calls: string[] = [];
	const complete = createSocialSignInCompletion({
		readAttempt: async () => ({ provider: "google", path: "/schedule" }),
		exchange: async (_provider, code) => {
			calls.push(code);
			return session.promise;
		},
		clearAttempt: async (): Promise<void> => {
			calls.push("cleared");
		},
	});
	const browser = complete("12345678");
	const deepLink = complete("12345678");
	expect(browser).toBe(deepLink);
	session.resolve({ signingIn: true });
	expect(await browser).toBe("/schedule");
	expect(await deepLink).toBe("/schedule");
	expect(calls).toEqual(["12345678", "cleared"]);
});

test("cancelling the browser clears the attempt without exchanging a code", async (): Promise<void> => {
	const events: string[] = [];
	expect(
		await completeNativeSocialSignIn({
			complete: async (): Promise<string> => {
				throw new Error("Unexpected exchange");
			},
			cancel: async (): Promise<void> => {
				events.push("cancelled");
			},
		}),
	).toBeUndefined();
	expect(events).toEqual(["cancelled"]);
});

test("missing codes and unrelated callback destinations cannot trigger an exchange", async (): Promise<void> => {
	for (const callback of [
		"uwh-club://auth-callback",
		"uwh-club://connect-account?code=12345678",
		"https://example.test/auth-callback?code=12345678",
		"uwh-club://auth-callback/other?code=12345678",
		"uwh-club://someone@auth-callback?code=12345678",
	]) {
		const calls: string[] = [];
		await expect(
			completeNativeSocialSignIn({
				callback,
				complete: async (code): Promise<string> => {
					calls.push(code);
					return "/";
				},
				cancel: async (): Promise<void> => {},
			}),
		).rejects.toThrow();
		expect(calls).toEqual([]);
	}
});

test("failed token exchanges preserve the attempt and never report success", async (): Promise<void> => {
	for (const exchange of [
		async (): Promise<{ signingIn: boolean }> => ({ signingIn: false }),
		async (): Promise<never> => {
			throw new Error("Network unavailable");
		},
	]) {
		const cleared: string[] = [];
		const complete = createSocialSignInCompletion({
			readAttempt: async () => ({ provider: "apple", path: "/account" }),
			exchange,
			clearAttempt: async (): Promise<void> => {
				cleared.push("cleared");
			},
		});
		await expect(complete("12345678")).rejects.toThrow();
		expect(cleared).toEqual([]);
	}
});
