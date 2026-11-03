import { expect, test } from "bun:test";

test("sign-in and recovery do not inherit the club invitation heading", async (): Promise<void> => {
	const source = await Bun.file("src/features/account-gate.tsx").text();
	expect(source).not.toContain('<AuthLayout title="Enter invite code">');
	expect(source).toContain("backend.authenticated && backend.accountInfo");
	expect(source).toContain('? "Enter invite code"');
	expect(source).toContain(': "UWH Club"');
});
