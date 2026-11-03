import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import { withInitialPoll } from "../src/demo/chat-poll-fixture";
import { previewGroupPolicyAtom } from "../src/demo/group-conversation-state";
import {
	closePreviewPollAtom,
	createPreviewPollAtom,
	previewToolsAtom,
	votePreviewPollAtom,
} from "../src/demo/preview-polls-state";
import { pollMessageId, summarizePoll } from "../src/domain/chat-polls";
import { reduceMessages } from "../src/domain/message-reducer";
import { previewMessageTimestamp } from "../src/domain/messaging";

const input = {
	key: "inline-poll",
	threadId: "club",
	draft: {
		question: " Which drill? ",
		options: [" Passing ", "Support"],
		multiple: false,
	},
};
test("preview poll creation atomically posts exactly one real message and keeps exact retry identity", (): void => {
	const store = createStore();
	store.set(previewDataAtom, withInitialPoll(initialAppData));
	const before = store.get(previewDataAtom);
	store.set(createPreviewPollAtom, input);
	const data = store.get(previewDataAtom);
	const poll = store
		.get(previewToolsAtom)
		.polls.find((poll) => poll.id === input.key);
	const message = data.messages.find((message) => message.pollId === input.key);
	expect(poll?.messageId).toBe(pollMessageId(input.key));
	expect(message?.body).toBe("Which drill?");
	expect(message?.id).toBe(poll?.messageId);
	expect(message?.createdAt).toBe(poll?.createdAt);
	expect(message?.createdAt).toBeGreaterThan(0);
	expect(data.messages).toHaveLength(before.messages.length + 1);
	expect(data.conversations).toEqual(before.conversations);
	store.set(createPreviewPollAtom, input);
	expect(store.get(previewDataAtom)).toBe(data);
	expect(
		store.get(previewToolsAtom).polls.filter((poll) => poll.id === input.key),
	).toHaveLength(1);
	expect(() =>
		store.set(createPreviewPollAtom, {
			...input,
			draft: { ...input.draft, question: "Other" },
		}),
	).toThrow();
	store.set(previewAccountIdAtom, "taylor");
	expect(() => store.set(createPreviewPollAtom, input)).toThrow();
});

test("inline preview votes stay scoped, retain state after errors and reject stale paused or blocked actions", (): void => {
	const store = createStore();
	store.set(previewDataAtom, {
		...initialAppData,
		conversations: [
			...initialAppData.conversations,
			{
				id: "dm-poll-private",
				title: "Private",
				subtitle: "Direct message",
				kind: "direct",
				accountIds: ["alex", "casey"],
			},
		],
	});
	const request = { ...input, threadId: "dm-poll-private" };
	store.set(createPreviewPollAtom, request);
	const vote = {
		pollId: request.key,
		threadId: request.threadId,
		choices: [1],
	};
	store.set(votePreviewPollAtom, vote);
	const saved = store.get(previewToolsAtom);
	expect(
		saved.polls.find((poll) => poll.id === request.key)?.votes.alex,
	).toEqual([1]);
	expect(() =>
		store.set(votePreviewPollAtom, { ...vote, choices: [0, 1] }),
	).toThrow();
	expect(store.get(previewToolsAtom)).toBe(saved);
	store.set(previewAccountIdAtom, "taylor");
	expect(() => store.set(votePreviewPollAtom, vote)).toThrow();
	expect(() =>
		store.set(closePreviewPollAtom, {
			pollId: request.key,
			threadId: request.threadId,
		}),
	).toThrow();
	store.set(previewAccountIdAtom, "alex");
	store.set(previewGroupPolicyAtom, { pausedIds: ["alex"], blockedPairs: [] });
	expect(() => store.set(votePreviewPollAtom, vote)).toThrow("paused");
	expect(() => store.set(createPreviewPollAtom, request)).toThrow("paused");
	store.set(previewGroupPolicyAtom, {
		pausedIds: [],
		blockedPairs: [{ userId: "casey", targetId: "alex" }],
	});
	expect(() => store.set(votePreviewPollAtom, vote)).toThrow();
	expect(store.get(previewToolsAtom)).toBe(saved);
});

test("deleting an anchored poll cannot resurrect its controls or overwrite its question as text", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(createPreviewPollAtom, input);
	const data = store.get(previewDataAtom);
	const messageId = pollMessageId(input.key);
	const original = data.messages.find((message) => message.id === messageId);
	expect(() =>
		reduceMessages(data, primaryAccount, {
			type: "edit-message",
			messageId,
			body: "Spoofed question",
		}),
	).toThrow("cannot be edited");
	const deleted = reduceMessages(data, primaryAccount, {
		type: "delete-message",
		messageId,
	});
	store.set(previewDataAtom, { ...data, ...deleted });
	expect(
		deleted.messages.find((message) => message.id === messageId)?.createdAt,
	).toBe(original?.createdAt);
	expect(() =>
		store.set(votePreviewPollAtom, {
			threadId: input.threadId,
			pollId: input.key,
			choices: [0],
		}),
	).toThrow("unavailable");
	expect(() => store.set(createPreviewPollAtom, input)).toThrow();
});

test("preview closure remains authoritative and message chronology uses real timestamps rather than array indexes", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(createPreviewPollAtom, input);
	store.set(closePreviewPollAtom, {
		pollId: input.key,
		threadId: input.threadId,
	});
	store.set(createPreviewPollAtom, input);
	const poll = store
		.get(previewToolsAtom)
		.polls.find((poll) => poll.id === input.key);
	if (!poll) throw new Error("Missing fixture poll");
	expect(summarizePoll(poll, "taylor", false).closed).toBe(true);
	expect(() =>
		store.set(votePreviewPollAtom, {
			pollId: input.key,
			threadId: input.threadId,
			choices: [0],
		}),
	).toThrow("closed");
	const message = store
		.get(previewDataAtom)
		.messages.find((message) => message.id === poll.messageId);
	if (!message) throw new Error("Missing fixture message");
	expect(previewMessageTimestamp(message)).toBe(poll.createdAt ?? -1);
	expect(
		previewMessageTimestamp({
			...message,
			createdAt: undefined,
			time: "Unknown",
		}),
	).toBe(0);
});
