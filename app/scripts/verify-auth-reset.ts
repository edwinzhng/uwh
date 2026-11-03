import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import {
	type AuthFields,
	authParameters,
	validateAuthStep,
} from "../src/features/auth-form-state";
import { localRun } from "./local-checks";
import { localCode } from "./test-auth";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const run = createVerificationRun("auth-reset-flow");
try {
	const fixture = await run.fixture("Reset flow verification");
	const oldPassword = fixture.password;
	const account = await fixture.client.query(api.account.current, {});
	assert(account);
	assert(account.email.endsWith("@example.test"));
	await localRun(
		"local_checks:resetMailCooldown",
		internal.local_checks.resetMailCooldown,
		{ email: account.email },
	);
	const recovery = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const fields: AuthFields = {
		email: account.email,
		name: account.name,
		password,
		confirmation: password,
		code: "",
	};
	const emailRequest = authParameters("reset", fields);
	assert(emailRequest);
	await recovery.action(api.auth.signIn, {
		provider: "password",
		params: emailRequest,
	});
	const code = await localCode(account.email);
	const completed = { ...fields, code };
	assert.equal(validateAuthStep("resetCode", completed), undefined);
	assert.equal(authParameters("resetCode", completed), undefined);
	assert.equal(
		await fixture.client
			.query(api.account.current, {})
			.then((value) => value?.id),
		account.id,
	);
	const finalRequest = authParameters("resetPassword", completed);
	assert(finalRequest);
	await assert.rejects(
		recovery.action(api.auth.signIn, {
			provider: "password",
			params: {
				...finalRequest,
				code: code === "000000" ? "111111" : "000000",
			},
		}),
	);
	const oldSession = new ConvexHttpClient(url, { logger: false });
	const oldLogin = await oldSession.action(api.auth.signIn, {
		provider: "password",
		params: {
			flow: "signIn",
			email: account.email,
			password: fixture.password,
		},
	});
	assert(oldLogin.tokens);
	oldSession.setAuth(oldLogin.tokens.token);
	assert(await oldSession.query(api.account.current, {}));
	const result = await recovery.action(api.auth.signIn, {
		provider: "password",
		params: finalRequest,
	});
	fixture.password = password;
	assert(result.tokens);
	fixture.client.setAuth(result.tokens.token);
	recovery.setAuth(result.tokens.token);
	assert.equal(await oldSession.query(api.account.current, {}), null);
	assert.equal((await recovery.query(api.account.current, {}))?.id, account.id);
	await assert.rejects(
		oldSession.action(api.auth.signIn, {
			provider: "password",
			params: {
				flow: "signIn",
				email: account.email,
				password: oldPassword,
			},
		}),
	);
	await assert.rejects(
		recovery.action(api.auth.signIn, {
			provider: "password",
			params: { ...finalRequest, newPassword: `${crypto.randomUUID()}Aa1!` },
		}),
	);
	const newLogin = await recovery.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "signIn", email: account.email, password },
	});
	assert(newLogin.tokens);
	fixture.client.setAuth(newLogin.tokens.token);
	console.log(
		"Reset flow verified: separate local code step, atomic code/password verification, invalid-code credential preservation, session rotation and one-use code. Fictional account cleanup follows.",
	);
} finally {
	await run.close();
}
