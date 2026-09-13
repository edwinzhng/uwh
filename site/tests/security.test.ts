import { expect, test } from "bun:test";
import {
	adminSessionSeconds,
	createAdminSession,
	validAdminSession,
} from "../lib/admin-session";
import { readJsonBody } from "../lib/request-body";

test("admin sessions expire on the server and reject tampering or rotated credentials", (): void => {
	const now = 1800000000000;
	const token = createAdminSession("key", "password", now);
	expect(validAdminSession(token, "key", "password", now)).toBe(true);
	expect(createAdminSession("key", "password", now)).not.toBe(token);
	expect(
		validAdminSession(
			token,
			"key",
			"password",
			now + adminSessionSeconds * 1000,
		),
	).toBe(false);
	expect(validAdminSession(token, "key", "new-password", now)).toBe(false);
	expect(validAdminSession(token, "new-key", "password", now)).toBe(false);
	expect(
		validAdminSession(token.replace(/^./, "9"), "key", "password", now),
	).toBe(false);
	expect(validAdminSession("malformed", "key", "password", now)).toBe(false);
	expect(validAdminSession(token, "", "", now)).toBe(false);
});
test("request size is enforced without trusting Content-Length", async (): Promise<void> => {
	const make = (body: string): Request =>
		new Request("https://example.test", { method: "POST", body });
	expect(
		(await readJsonBody(make(JSON.stringify({ ok: true })), 100)).value,
	).toEqual({ ok: true });
	expect((await readJsonBody(make("x".repeat(101)), 100)).error?.status).toBe(
		413,
	);
	expect((await readJsonBody(make("bad json"), 100)).error?.status).toBe(400);
	const request = make("x".repeat(101));
	request.headers.set("content-length", "1");
	expect((await readJsonBody(request, 100)).error?.status).toBe(413);
});
