import type { Account, Conversation } from "./app-types";
import { conversationKind } from "./messaging";

export const chatIcons = [
	"message",
	"users",
	"calendar",
	"shield",
	"trophy",
	"target",
	"barChart",
	"star",
] as const;
export type ChatIcon = (typeof chatIcons)[number];
export type ChatAppearance = { avatarIcon?: ChatIcon; avatarImageId?: string };
export const isChatIcon = (value: string): value is ChatIcon =>
	chatIcons.some((icon) => icon === value);
export const canEditChatAppearance = (
	thread: Conversation,
	actor: Pick<Account, "id" | "admin" | "coachPrograms">,
): boolean =>
	thread.accountIds.includes(actor.id) &&
	(["direct", "group"].includes(conversationKind(thread)) ||
		actor.admin ||
		actor.coachPrograms.length > 0);
export const sameChatAppearance = (
	first: ChatAppearance,
	second: ChatAppearance,
): boolean =>
	first.avatarIcon === second.avatarIcon &&
	first.avatarImageId === second.avatarImageId;

export const canRenameChat = (
	thread: Conversation,
	actor: Pick<Account, "id" | "admin" | "coachPrograms">,
): boolean =>
	conversationKind(thread) === "group" && canEditChatAppearance(thread, actor);
