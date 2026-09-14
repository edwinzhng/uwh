import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";

export const localCode = async (email: string): Promise<string> => {
	if (
		process.env.EXPO_PUBLIC_CONVEX_URL !== "http://127.0.0.1:3210" ||
		!email.endsWith("@example.test")
	)
		throw new Error("Use fictional accounts on the local backend only.");
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			"local_email:latest",
			JSON.stringify({ email: email.trim().toLowerCase() }),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const output = await new Response(child.stdout).text();
	assert.equal(
		await child.exited,
		0,
		"Couldn’t read local verification email.",
	);
	const code: unknown = JSON.parse(output);
	assert(
		typeof code === "string" && /^\d{8}$/.test(code),
		"Verification email missing.",
	);
	return code;
};
export const signInVerified = async (
	client: ConvexHttpClient,
	args: FunctionArgs<typeof api.auth.signIn>,
): Promise<FunctionReturnType<typeof api.auth.signIn>> => {
	const result = await client.action(api.auth.signIn, args);
	if (result.tokens || args.params?.flow !== "signUp") return result;
	const email = args.params.email;
	assert(typeof email === "string");
	return client.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "email-verification", email, code: await localCode(email) },
	});
};
