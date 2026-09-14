import { expect, test } from "bun:test";
import { inviteEmail, inviteState, inviteUrl } from "../src/domain/invitations";

test("invitations normalize addresses and reject malformed recipients", (): void => {
	expect(inviteEmail(" PLAYER@EXAMPLE.TEST ")).toBe("player@example.test");
	for (const email of [
		"",
		"bad",
		"a@b",
		"a@example.test\nBcc:x@example.test",
		`${"x".repeat(255)}@example.test`,
	])
		expect(() => inviteEmail(email)).toThrow();
});
test("expired, revoked, accepted and replaced invitations never look pending", (): void => {
	const invitation = {
		state: "pending" as const,
		expiresAt: 1000,
		revision: 2,
	};
	expect(inviteState(invitation, 2, 999)).toBe("pending");
	expect(inviteState(invitation, 2, 1000)).toBe("expired");
	expect(inviteState(invitation, 1, 999)).toBe("replaced");
	expect(inviteState({ ...invitation, state: "revoked" }, 2, 999)).toBe(
		"revoked",
	);
	expect(inviteState({ ...invitation, state: "accepted" }, 2, 1001)).toBe(
		"accepted",
	);
});
test("invitation links keep recipient data out of the URL and encode references", (): void => {
	const url = new URL(inviteUrl("https://club.example/settings", "a&b=1", 3));
	expect(url.pathname).toBe("/join");
	expect(url.searchParams.get("invite")).toBe("a&b=1");
	expect(url.searchParams.get("revision")).toBe("3");
	expect([...url.searchParams.keys()]).toEqual(["invite", "revision"]);
});
