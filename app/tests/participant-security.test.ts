import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData, previewAccounts } from "../src/demo/app-data";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import { previewGroupPolicyAtom } from "../src/demo/group-conversation-state";
import { addPreviewParticipantsAtom } from "../src/demo/thread-participants-state";
import { activeMessageRecipient } from "../src/domain/message-recipients";
import {
	normalizeParticipantIds,
	participantPersonIds,
	sameParticipantIds,
} from "../src/domain/thread-participants";

const direct = {
	id: "dm-security-fixture",
	kind: "direct" as const,
	title: "Private fixture",
	subtitle: "Direct message",
	accountIds: ["alex", "casey"],
};
const data = { ...initialAppData, conversations: [direct] };
const request = {
	threadId: direct.id,
	recipientIds: ["person:taylor"],
	groupId: "group-security-fixture",
};

test("participant metadata contains known people only, never raw account IDs", (): void => {
	expect(
		participantPersonIds(
			["account-a", "account-b", "person:pending", "account-no-member"],
			["archived-person", "account-a", "erased-person", "pending"],
			[
				{ id: "account-a", personId: "person-a" },
				{ id: "account-b", personId: "person-b" },
				{ id: "account-no-member", personId: "missing-person" },
			],
			["person-a", "person-b", "archived-person", "pending"],
		),
	).toEqual(["archived-person", "pending", "person-a", "person-b"]);
});

test("participant additions reject archived and merged identities through both person and raw account IDs", (): void => {
	for (const state of [{ archived: true }, { mergedInto: "canonical" }]) {
		const people = data.members.map((person) =>
			person.id === "taylor" ? { ...person, ...state } : person,
		);
		for (const id of ["taylor", "person:taylor"])
			expect(activeMessageRecipient(id, previewAccounts, people)).toBe(false);
		const store = createStore();
		store.set(previewDataAtom, { ...data, members: people });
		expect(() => store.set(addPreviewParticipantsAtom, request)).toThrow(
			"active member",
		);
		expect(store.get(previewDataAtom).conversations).toEqual([direct]);
	}
	expect(activeMessageRecipient("missing", previewAccounts, data.members)).toBe(
		false,
	);
	expect(
		activeMessageRecipient("person:missing", previewAccounts, data.members),
	).toBe(false);
	expect(activeMessageRecipient("taylor", previewAccounts, data.members)).toBe(
		true,
	);
});

test("conversion receipts compare canonical requested recipients and fail closed on unknown historical receipts", (): void => {
	const ids = normalizeParticipantIds(["second", "first", "second"]);
	expect(ids).toEqual(["first", "second"]);
	expect(
		sameParticipantIds(ids, normalizeParticipantIds(["second", "first"])),
	).toBe(true);
	expect(sameParticipantIds(ids, ["first", "other"])).toBe(false);
	expect(sameParticipantIds(undefined, ids)).toBe(false);
	for (const invalid of [
		[],
		[""],
		["x".repeat(201)],
		Array.from({ length: 51 }, () => "same"),
	])
		expect(() => normalizeParticipantIds(invalid)).toThrow("1–50");
});

test("a preview conversion retries exactly without copying DM history or accepting a changed audience", (): void => {
	const store = createStore();
	store.set(previewDataAtom, data);
	expect(store.set(addPreviewParticipantsAtom, request)).toBe(request.groupId);
	const created = store.get(previewDataAtom);
	expect(store.set(addPreviewParticipantsAtom, request)).toBe(request.groupId);
	expect(store.get(previewDataAtom)).toBe(created);
	expect(() =>
		store.set(addPreviewParticipantsAtom, {
			...request,
			recipientIds: ["person:jamie"],
		}),
	).toThrow("identifier");
	expect(store.get(previewDataAtom)).toBe(created);
	expect(created.messages).toBe(data.messages);
	expect(
		created.conversations.find((thread) => thread.id === direct.id),
	).toEqual(direct);
	expect(
		created.conversations.find((thread) => thread.id === request.groupId)
			?.accountIds,
	).toEqual(["alex", "casey", "taylor"]);
	store.set(previewAccountIdAtom, "casey");
	expect(() => store.set(addPreviewParticipantsAtom, request)).toThrow(
		"identifier",
	);
});

test("preview conversions recheck pauses and blocks before creation and replay", (): void => {
	for (const policy of [
		{ pausedIds: ["alex"], blockedPairs: [] },
		{ pausedIds: ["taylor"], blockedPairs: [] },
		{ pausedIds: [], blockedPairs: [{ userId: "casey", targetId: "taylor" }] },
	]) {
		const store = createStore();
		store.set(previewDataAtom, data);
		store.set(previewGroupPolicyAtom, policy);
		expect(() => store.set(addPreviewParticipantsAtom, request)).toThrow(
			"unavailable",
		);
		expect(store.get(previewDataAtom)).toBe(data);
		store.set(previewGroupPolicyAtom, { pausedIds: [], blockedPairs: [] });
		store.set(addPreviewParticipantsAtom, request);
		const created = store.get(previewDataAtom);
		store.set(previewGroupPolicyAtom, policy);
		expect(() => store.set(addPreviewParticipantsAtom, request)).toThrow(
			"unavailable",
		);
		expect(store.get(previewDataAtom)).toBe(created);
	}
});
