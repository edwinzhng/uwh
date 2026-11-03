import { expect, test } from "bun:test";
import type { Account, Conversation } from "../src/domain/app-types";
import {
	canEditChatAppearance,
	canRenameChat,
	chatIcons,
	isChatIcon,
	sameChatAppearance,
} from "../src/domain/chat-appearance";

const actor: Pick<Account, "id" | "admin" | "coachPrograms"> = {
	id: "member",
	admin: false,
	coachPrograms: [],
};
const thread: Conversation = {
	id: "group-one",
	kind: "group",
	title: "Group",
	subtitle: "",
	accountIds: ["member", "other"],
};

test("participants manage direct and group pictures while channels require club staff", (): void => {
	expect(canEditChatAppearance(thread, actor)).toBe(true);
	expect(canEditChatAppearance({ ...thread, kind: "direct" }, actor)).toBe(
		true,
	);
	expect(
		canEditChatAppearance({ ...thread, id: "club", kind: undefined }, actor),
	).toBe(false);
	expect(
		canEditChatAppearance(
			{ ...thread, id: "club", kind: undefined },
			{ ...actor, admin: true },
		),
	).toBe(true);
	expect(
		canEditChatAppearance(
			{ ...thread, accountIds: [] },
			{ ...actor, admin: true },
		),
	).toBe(false);
});

test("chat appearance accepts only curated icons and compares picture edits for conflict detection", (): void => {
	for (const icon of chatIcons) expect(isChatIcon(icon)).toBe(true);
	expect(isChatIcon("arbitrary-url")).toBe(false);
	expect(
		sameChatAppearance({ avatarImageId: "one" }, { avatarImageId: "two" }),
	).toBe(false);
	expect(
		sameChatAppearance({ avatarIcon: "star" }, { avatarImageId: "one" }),
	).toBe(false);
	expect(sameChatAppearance({}, {})).toBe(true);
});

test("only private groups can be renamed, including when a managed room claims group kind", (): void => {
	expect(canRenameChat(thread, actor)).toBe(true);
	for (const id of ["room:program:monday", "youth", "club", "room:staff"])
		expect(canRenameChat({ ...thread, id }, actor)).toBe(false);
	expect(canRenameChat({ ...thread, kind: "direct" }, actor)).toBe(false);
	expect(canRenameChat({ ...thread, accountIds: ["other"] }, actor)).toBe(
		false,
	);
});
