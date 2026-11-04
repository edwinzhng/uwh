import { expect, test } from "bun:test";
import {
	localAccounts,
	snapshotEntryAllowed,
} from "../scripts/local-production/policy";
import {
	type LocalSignInMessage,
	localAccountSwitchAllowed,
	localAccountToolsAllowed,
	localSignInMessage,
} from "../src/domain/local-account-tools";

test("local account switching cannot be enabled for production or another backend", (): void => {
	for (const backendUrl of [
		undefined,
		"https://brainy-albatross-874.convex.cloud",
		"http://127.0.0.1:3210",
		"http://127.0.0.1:3330.evil.test",
	])
		expect(localAccountToolsAllowed("true", backendUrl)).toBe(false);
	expect(localAccountToolsAllowed(undefined, "http://127.0.0.1:3330")).toBe(
		false,
	);
	const settings = {
		enabled: "true",
		backendUrl: "http://127.0.0.1:3330",
		outboundDisabled: "true",
		emailMode: "local",
	};
	expect(localAccountSwitchAllowed(settings)).toBe(true);
	expect(
		localAccountSwitchAllowed({ ...settings, outboundDisabled: "false" }),
	).toBe(false);
	expect(localAccountSwitchAllowed({ ...settings, emailMode: "resend" })).toBe(
		false,
	);
});

test("snapshot copies preserve records and storage while omitting credentials and delivery capabilities", (): void => {
	for (const entry of [
		"users/documents.jsonl",
		"memberships/documents.jsonl",
		"messages/generated_schema.jsonl",
		"_tables/documents.jsonl",
		"_storage/file-id",
	])
		expect(snapshotEntryAllowed(entry)).toBe(true);
	for (const table of [
		"authAccounts",
		"authSessions",
		"authRefreshTokens",
		"authVerificationCodes",
		"authFutureCredentials",
		"webPushSubscriptions",
		"pushDevices",
		"calendarFeeds",
		"localEmails",
		"youtubeConnections",
	])
		expect(snapshotEntryAllowed(`${table}/documents.jsonl`)).toBe(false);
	for (const entry of [
		"../secret",
		"users/../secret",
		"/users/documents.jsonl",
		"users/..",
		"users/./",
	])
		expect(snapshotEntryAllowed(entry)).toBe(false);
});

test("historical authors and unverified records are not offered as login accounts", (): void => {
	expect(
		localAccounts([
			{ _id: "historical", name: "Author" },
			{ _id: "unverified", email: "unverified@example.test" },
			{
				_id: "verified",
				name: "Member",
				email: "member@example.test",
				emailVerificationTime: 1,
			},
		]),
	).toEqual([{ id: "verified", name: "Member", email: "member@example.test" }]);
});

test("account handoffs accept only the expected typed code message", (): void => {
	const message: LocalSignInMessage = {
		type: "uwh-local-sign-in",
		email: "member@example.test",
		code: "012345",
		requestId: "request",
	};
	expect(localSignInMessage(message)).toEqual(message);
	expect(localSignInMessage({ ...message, code: "12345" })).toBeUndefined();
	expect(localSignInMessage({ ...message, type: "sign-in" })).toBeUndefined();
	expect(localSignInMessage({ ...message, requestId: 1 })).toBeUndefined();
});
