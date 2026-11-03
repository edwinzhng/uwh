import { expect, test } from "bun:test";
import { createStore } from "jotai";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	createPreviewGroupAtom,
	previewGroupPolicyAtom,
} from "../src/demo/group-conversation-state";
import {
	conversationDraftError,
	type GroupDraft,
	type GroupPolicy,
	groupLimits,
	normalizeGroup,
	planGroupConversation,
	sameGroupCreation,
} from "../src/domain/group-conversation";
import { recipientDirectory } from "../src/domain/message-recipients";

const draft = {
	groupId: "group-practice",
	name: "Practice planning",
	recipientIds: ["person:taylor", "person:casey"],
} satisfies GroupDraft;
const available: GroupPolicy = { pausedIds: [], blockedPairs: [] };
const plan = (
	input: GroupDraft = draft,
	policy: GroupPolicy = available,
): ReturnType<typeof planGroupConversation> =>
	planGroupConversation(
		input,
		primaryAccount,
		previewAccounts,
		initialAppData.members,
		policy,
	);

test("named groups normalize names and recipient order without broadening membership", (): void => {
	const result = plan({
		...draft,
		name: "  Practice   planning\n ",
		recipientIds: ["person:taylor", "person:casey", "person:taylor"],
	});
	expect(result.draft.name).toBe("Practice planning");
	expect(result.draft.recipientIds).toEqual(["person:casey", "person:taylor"]);
	expect(result.conversation).toEqual({
		id: draft.groupId,
		title: "Practice planning",
		subtitle: "Group chat",
		kind: "group",
		accountIds: ["alex", "casey", "taylor"],
		participantPersonIds: ["alex", "casey", "taylor"],
	});
	expect(result.pendingPersonIds).toEqual([]);
	expect(sameGroupCreation(result.draft, normalizeGroup(draft))).toBe(true);
	expect(
		sameGroupCreation(result.draft, { ...result.draft, name: "Other" }),
	).toBe(false);
});

test("group validation rejects invalid IDs, names, duplicates-only and unavailable people", (): void => {
	for (const groupId of [
		"group-",
		"club",
		"room:staff",
		"session:event",
		"x".repeat(161),
	])
		expect(() => plan({ ...draft, groupId })).toThrow();
	for (const name of ["", "  ", "x".repeat(groupLimits.name + 1)])
		expect(() => plan({ ...draft, name })).toThrow();
	for (const recipientIds of [
		[],
		["person:taylor"],
		["person:taylor", "person:taylor"],
		["person:alex", "person:taylor"],
		["other-club", "person:taylor"],
		["person:missing", "person:taylor"],
		Array.from(
			{ length: groupLimits.recipients + 1 },
			(_, index) => `person:${index}`,
		),
	])
		expect(() => plan({ ...draft, recipientIds })).toThrow();
	expect(() =>
		planGroupConversation(
			draft,
			primaryAccount,
			previewAccounts.filter((entry) => entry.id !== primaryAccount.id),
			initialAppData.members,
			available,
		),
	).toThrow();
	expect(() =>
		planGroupConversation(
			{ ...draft, recipientIds: ["person:jordan", "person:taylor"] },
			primaryAccount,
			previewAccounts,
			initialAppData.members.map((person) =>
				person.id === "jordan"
					? { ...person, mergedInto: "taylor", archived: true }
					: person,
			),
			available,
		),
	).toThrow();
});

test("unconnected profiles stay pending and grants are limited to actual selected accounts", (): void => {
	const result = plan({
		...draft,
		recipientIds: ["person:jordan", "person:taylor"],
	});
	expect(result.pendingPersonIds).toEqual(["jordan"]);
	expect(result.conversation.accountIds).toEqual(["alex", "taylor"]);
	expect(result.conversation.participantPersonIds).toEqual([
		"alex",
		"jordan",
		"taylor",
	]);
	expect(
		previewAccounts.find((account) => account.id === "taylor")?.admin,
	).toBe(false);
});

test("group creation enforces actor, invitee and pairwise block or paused policies", (): void => {
	for (const pausedIds of [["alex"], ["taylor"], ["casey"]])
		expect(() => plan(draft, { ...available, pausedIds })).toThrow();
	for (const [userId, targetId] of [
		["alex", "taylor"],
		["taylor", "alex"],
		["casey", "taylor"],
		["taylor", "casey"],
	])
		expect(() =>
			plan(draft, {
				pausedIds: [],
				blockedPairs: [{ userId: userId ?? "", targetId: targetId ?? "" }],
			}),
		).toThrow();
	expect(
		plan(draft, {
			pausedIds: ["morgan"],
			blockedPairs: [{ userId: "morgan", targetId: "jamie" }],
		}).conversation.id,
	).toBe(draft.groupId);
});

test("new message validation permits one-person direct chat and requires a name for groups", (): void => {
	const directory = recipientDirectory(
		previewAccounts,
		initialAppData.members,
		"alex",
		[],
		false,
	);
	expect(
		conversationDraftError(["person:taylor"], "", directory),
	).toBeUndefined();
	expect(conversationDraftError([], "", directory)).toBeDefined();
	expect(conversationDraftError(draft.recipientIds, "", directory)).toBe(
		"Add a group name",
	);
	expect(
		conversationDraftError(draft.recipientIds, "x".repeat(81), directory),
	).toBe("Use 80 characters or fewer");
	expect(
		conversationDraftError(draft.recipientIds, draft.name, directory),
	).toBeUndefined();
	expect(conversationDraftError(draft.recipientIds, draft.name)).toBeDefined();
	expect(
		conversationDraftError(draft.recipientIds, draft.name, {
			recipients: [],
			paused: true,
		}),
	).toContain("paused");
});

test("preview creates a group directly once without touching private history", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	const before = store.get(previewDataAtom);
	expect(store.set(createPreviewGroupAtom, draft)).toBe(draft.groupId);
	const created = store.get(previewDataAtom);
	expect(created.conversations).toHaveLength(before.conversations.length + 1);
	expect(created.messages).toBe(before.messages);
	expect(
		created.conversations.filter((thread) => thread.id !== draft.groupId),
	).toEqual(before.conversations);
	expect(
		store.set(createPreviewGroupAtom, {
			...draft,
			recipientIds: [...draft.recipientIds].reverse(),
		}),
	).toBe(draft.groupId);
	expect(store.get(previewDataAtom)).toBe(created);
	for (const input of [
		{ ...draft, name: "Different" },
		{ ...draft, recipientIds: ["person:taylor", "person:jamie"] },
	])
		expect(() => store.set(createPreviewGroupAtom, input)).toThrow();
	store.set(previewAccountIdAtom, "morgan");
	expect(() => store.set(createPreviewGroupAtom, draft)).toThrow();
	expect(store.get(previewDataAtom)).toBe(created);
});

test("preview retries recheck current access and creation is rate bounded", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(createPreviewGroupAtom, draft);
	const created = store.get(previewDataAtom);
	store.set(previewGroupPolicyAtom, { pausedIds: ["alex"], blockedPairs: [] });
	expect(() => store.set(createPreviewGroupAtom, draft)).toThrow();
	store.set(previewGroupPolicyAtom, {
		pausedIds: [],
		blockedPairs: [{ userId: "casey", targetId: "taylor" }],
	});
	expect(() => store.set(createPreviewGroupAtom, draft)).toThrow();
	expect(store.get(previewDataAtom)).toBe(created);
	store.set(previewGroupPolicyAtom, available);
	for (const index of Array.from(
		{ length: groupLimits.perMinute - 1 },
		(_, index) => index,
	))
		store.set(createPreviewGroupAtom, {
			...draft,
			groupId: `group-rate-${index}`,
		});
	expect(() =>
		store.set(createPreviewGroupAtom, { ...draft, groupId: "group-rate-over" }),
	).toThrow("quickly");
	expect(store.set(createPreviewGroupAtom, draft)).toBe(draft.groupId);
});
