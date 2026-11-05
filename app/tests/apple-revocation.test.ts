import { expect, test } from "bun:test";
import { revokeAppleToken } from "../convex/apple_revocation";
import {
	decryptAppleToken,
	encryptAppleToken,
} from "../convex/apple_token_crypto";

const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
	"base64",
);
test("Apple tokens use authenticated randomized encryption", async (): Promise<void> => {
	const token = "fictional-refresh-token";
	const first = await encryptAppleToken(token, key);
	expect(first).not.toContain(token);
	expect(await encryptAppleToken(token, key)).not.toBe(first);
	expect(await decryptAppleToken(first, key)).toBe(token);
	await expect(
		decryptAppleToken(first, Buffer.alloc(32, 7).toString("base64")),
	).rejects.toThrow();
	await expect(
		decryptAppleToken(`${first.slice(0, -4)}AAAA`, key),
	).rejects.toThrow();
});
test("Apple token capture rejects missing tokens and invalid keys", async (): Promise<void> => {
	await expect(encryptAppleToken("", key)).rejects.toThrow(
		"usable authorization token",
	);
	await expect(encryptAppleToken("token", "invalid")).rejects.toThrow(
		"not configured",
	);
});
test("Apple revocation sends a form to the official endpoint", async (): Promise<void> => {
	const requests: string[] = [];
	await revokeAppleToken(
		"refresh-token",
		"service-id",
		"client-secret",
		async (url, options): Promise<Response> => {
			requests.push(url);
			expect(options.method).toBe("POST");
			if (!(options.body instanceof URLSearchParams))
				throw new Error("Expected form body");
			expect(Object.fromEntries(options.body)).toEqual({
				client_id: "service-id",
				client_secret: "client-secret",
				token: "refresh-token",
				token_type_hint: "refresh_token",
			});
			return new Response("", { status: 200 });
		},
	);
	expect(requests).toEqual(["https://appleid.apple.com/auth/revoke"]);
});
test("Apple failures stay retryable without exposing provider diagnostics", async (): Promise<void> => {
	await expect(
		revokeAppleToken(
			"token",
			"id",
			"secret",
			async (): Promise<Response> =>
				new Response("private diagnostics", { status: 503 }),
		),
	).rejects.toThrow("needs a retry");
});
test("Missing configuration does not send a request", async (): Promise<void> => {
	const requests: string[] = [];
	await expect(
		revokeAppleToken("token", "", "secret", async (url): Promise<Response> => {
			requests.push(url);
			return new Response();
		}),
	).rejects.toThrow("not configured");
	expect(requests).toEqual([]);
});
