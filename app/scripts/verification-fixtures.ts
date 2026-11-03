import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { signInVerified } from "./test-auth";

export type VerificationFixture = {
	client: ConvexHttpClient;
	password: string;
	token: string;
};
export const createVerificationRun = (
	prefix: string,
): {
	fixture: (name: string) => Promise<VerificationFixture>;
	dispose: (
		fixture: VerificationFixture,
		transferTo?: Id<"users">,
	) => Promise<void>;
	close: () => Promise<void>;
} => {
	const url = process.env.EXPO_PUBLIC_CONVEX_URL;
	if (url !== "http://127.0.0.1:3210")
		throw new Error(
			"Fictional verification accounts require the isolated local backend.",
		);
	const fixtures: VerificationFixture[] = [];
	const dispose = async (
		fixture: VerificationFixture,
		transferTo?: Id<"users">,
	): Promise<void> => {
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
			transferTo,
		});
		const index = fixtures.indexOf(fixture);
		if (index >= 0) fixtures.splice(index, 1);
	};
	return {
		dispose,
		fixture: async (name): Promise<VerificationFixture> => {
			const client = new ConvexHttpClient(url, { logger: false });
			const password = `${crypto.randomUUID()}Aa1!`;
			const result = await signInVerified(client, {
				provider: "password",
				params: {
					flow: "signUp",
					email: `${prefix}-${crypto.randomUUID()}@example.test`,
					password,
					name,
				},
			});
			assert(result.tokens);
			client.setAuth(result.tokens.token);
			const fixture = { client, password, token: result.tokens.token };
			fixtures.push(fixture);
			return fixture;
		},
		close: async (): Promise<void> => {
			const failures: unknown[] = [];
			for (const fixture of fixtures.toReversed()) {
				try {
					await dispose(fixture);
				} catch (error) {
					failures.push(error);
				}
			}
			if (failures.length)
				throw new AggregateError(
					failures,
					"Some isolated verification accounts could not be cleaned up.",
				);
		},
	};
};
