import { expect, test } from "bun:test";
import { localEmailAllowed } from "../src/domain/local-development-email";

test("real-email local inbox requires an exact server-side allowlist and loopback backend", () => {
	const input = {
		email: "owner@example.com",
		mode: "local",
		backendUrl: "http://127.0.0.1:3210",
		allowedEmails: "owner@example.com",
	};
	expect(localEmailAllowed(input)).toBe(true);
	expect(localEmailAllowed({ ...input, allowedEmails: undefined })).toBe(false);
	expect(localEmailAllowed({ ...input, email: "other@example.com" })).toBe(
		false,
	);
	expect(
		localEmailAllowed({
			...input,
			backendUrl: "https://production.convex.cloud",
		}),
	).toBe(false);
	expect(localEmailAllowed({ ...input, mode: "resend" })).toBe(false);
	expect(
		localEmailAllowed({
			...input,
			backendUrl: "http://localhost.attacker.test:3210",
		}),
	).toBe(false);
	expect(
		localEmailAllowed({
			...input,
			email: "demo@example.test",
			allowedEmails: undefined,
		}),
	).toBe(true);
});
