import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { decodeJwt } from "jose";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { localRun } from "./local-checks";
import { localCode } from "./test-auth";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const run = createVerificationRun("email-code");
try {
	const fixture = await run.fixture("Existing club player");
	const account = await fixture.client.query(api.account.current, {});
	assert(account);
	await fixture.client.mutation(api.club.create, {
		name: "Email code verification",
		samples: false,
	});
	const before = await fixture.client.query(api.club.current, {});
	await localRun(
		"local_checks:resetMailCooldown",
		internal.local_checks.resetMailCooldown,
		{ email: account.email },
	);
	const login = new ConvexHttpClient(url, { logger: false });
	await login.action(api.auth.signIn, {
		provider: "email-code",
		params: { email: account.email },
	});
	await assert.rejects(
		login.action(api.auth.signIn, {
			provider: "email-code",
			params: { email: account.email },
		}),
	);
	const code = await localCode(account.email);
	await assert.rejects(
		login.action(api.auth.signIn, {
			provider: "email-code",
			params: {
				email: account.email,
				code: code === "000000" ? "000001" : "000000",
			},
		}),
	);
	await assert.rejects(
		login.action(api.auth.signIn, {
			provider: "email-code",
			params: { email: "someone-else@example.test", code },
		}),
	);
	const result = await login.action(api.auth.signIn, {
		provider: "email-code",
		params: { email: account.email, code },
	});
	assert(result.tokens);
	login.setAuth(result.tokens.token);
	assert.equal((await login.query(api.account.current, {}))?.id, account.id);
	assert.deepEqual(
		(await login.query(api.club.current, {}))?.account,
		before?.account,
	);
	const verified = await login.query(api.connected_accounts.list, {});
	assert(verified.reauthenticated);
	const replay = new ConvexHttpClient(url, { logger: false });
	await assert.rejects(
		replay.action(api.auth.signIn, {
			provider: "email-code",
			params: { email: account.email, code },
		}),
	);
	for (const provider of ["google", "apple"] as const) {
		const linked: Id<"users"> = await localRun(
			"local_social:provision",
			internal.local_social.provision,
			{
				email: account.email,
				provider,
				subject: crypto.randomUUID(),
				verified: true,
				name: "Provider replacement name",
			},
		);
		assert.equal(linked, account.id);
		await assert.rejects(
			localRun("local_social:provision", internal.local_social.provision, {
				email: account.email,
				provider,
				subject: crypto.randomUUID(),
				verified: false,
				name: "Unverified claim",
			}),
		);
	}
	assert.equal(
		(await login.query(api.account.current, {}))?.name,
		account.name,
	);
	assert.deepEqual(
		(await login.query(api.club.current, {}))?.account,
		before?.account,
	);
	const refreshed = await replay.action(api.auth.signIn, {
		refreshToken: result.tokens.refreshToken,
	});
	assert(refreshed.tokens);
	assert.equal(
		decodeJwt(refreshed.tokens.token).sub,
		decodeJwt(result.tokens.token).sub,
	);
	login.setAuth(refreshed.tokens.token);
	assert.equal(
		(await login.query(api.connected_accounts.list, {})).verificationExpiresAt,
		verified.verificationExpiresAt,
	);
	console.log(
		"Email-code sign-in preserves identity and club roles; verified Google/Apple emails auto-link; invalid codes, wrong emails, replay and rapid resends are rejected; refresh preserves the sensitive-action verification window.",
	);
} finally {
	await run.close();
}
