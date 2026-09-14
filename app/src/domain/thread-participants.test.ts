import { expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../demo/app-data";
import type { AppData, Conversation } from "./app-types";
import {
	addPreviewParticipants,
	previewThreadParticipants,
} from "./thread-participants";

const direct: Conversation = {
	id: "dm-fixture",
	kind: "direct",
	title: "Private",
	subtitle: "Direct message",
	accountIds: ["alex", "casey"],
};
const data: AppData = {
	...initialAppData,
	conversations: [direct],
	messages: [
		{
			id: "private-history",
			threadId: direct.id,
			body: "Private fixture",
			accountId: "alex",
			author: "Alex",
			time: "Now",
		},
	],
};

test("adding to a direct chat creates a new group without copying private history", () => {
	const result = addPreviewParticipants(
		data,
		previewAccounts,
		primaryAccount,
		direct.id,
		["person:taylor"],
		"group-fixture",
	);
	expect(result.threadId).toBe("group-fixture");
	expect(
		result.data.conversations.find((thread) => thread.id === direct.id),
	).toEqual(direct);
	expect(result.data.messages).toBe(data.messages);
	expect(
		result.data.messages.filter(
			(message) => message.threadId === result.threadId,
		),
	).toEqual([]);
	expect(
		result.data.conversations.find((thread) => thread.id === result.threadId)
			?.accountIds,
	).toEqual(["alex", "casey", "taylor"]);
});
test("group additions preserve history and show participant names", () => {
	const group: Conversation = {
		...direct,
		id: "group-existing",
		kind: "group",
	};
	const current = { ...data, conversations: [group] };
	const result = addPreviewParticipants(
		current,
		previewAccounts,
		primaryAccount,
		group.id,
		["person:taylor"],
		"unused",
	);
	const updated = result.data.conversations.at(0);
	if (!updated) throw new Error("Group missing");
	expect(result.threadId).toBe(group.id);
	expect(result.data.messages).toBe(current.messages);
	expect(
		previewThreadParticipants(
			result.data,
			previewAccounts,
			primaryAccount,
			updated,
		).members.some((member) => member.id === "person:taylor"),
	).toBe(true);
	expect(
		previewThreadParticipants(
			result.data,
			previewAccounts,
			primaryAccount,
			updated,
		).candidates.some((member) => member.id === "person:taylor"),
	).toBe(false);
});
test("General and event membership cannot be manually extended", () => {
	for (const thread of [
		{ ...direct, id: "club" },
		{ ...direct, eventId: "practice" },
	]) {
		expect(
			previewThreadParticipants(data, previewAccounts, primaryAccount, thread)
				.canAdd,
		).toBe(false);
		expect(() =>
			addPreviewParticipants(
				{ ...data, conversations: [thread] },
				previewAccounts,
				primaryAccount,
				thread.id,
				["person:taylor"],
				"new",
			),
		).toThrow();
	}
});
test("people outside a conversation cannot add participants", () => {
	const outsider = previewAccounts.find((account) => account.id === "taylor");
	if (!outsider) throw new Error("Fixture missing");
	expect(() =>
		addPreviewParticipants(
			data,
			previewAccounts,
			outsider,
			direct.id,
			["person:jamie"],
			"new",
		),
	).toThrow();
});
