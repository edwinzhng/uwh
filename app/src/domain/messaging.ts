import emojiRegex from "emoji-regex";
import type { Conversation, Message } from "./app-types";
import { managedRoom } from "./managed-rooms";

export type ThreadMessage = Message & { createdAt: number; reply?: Message };
export const previewMessageTimestamp = (message: Message): number => {
	const timestamp = message.createdAt ?? Date.parse(message.time);
	return Number.isFinite(timestamp) ? timestamp : 0;
};
export type ConversationSummary = Conversation & {
	participants?: { personId: string; name: string }[];
	latest?: Message;
	updatedAt: number;
	unread: number;
	readThrough: number;
};

export const conversationActivityAt = (thread: ConversationSummary): number =>
	thread.latest
		? previewMessageTimestamp(thread.latest) || thread.updatedAt
		: thread.updatedAt;

export const compareConversations = (
	a: ConversationSummary,
	b: ConversationSummary,
): number =>
	Number(Boolean(b.latest)) - Number(Boolean(a.latest)) ||
	conversationActivityAt(b) - conversationActivityAt(a) ||
	a.id.localeCompare(b.id);
export const messagePageSize = 40;
export type ConversationKind =
	| "general"
	| "staff"
	| "program"
	| "event"
	| "direct"
	| "group";
export const conversationKind = (thread: Conversation): ConversationKind => {
	const room = managedRoom(thread.id);
	if (room) return room.kind;
	if (thread.eventId) return "event";
	if (thread.kind) return thread.kind;
	if (thread.id.startsWith("session:") || thread.id === "session")
		return "event";
	if (
		thread.id.startsWith("dm-") ||
		thread.subtitle === "Direct message" ||
		thread.id === "casey"
	)
		return "direct";
	return "group";
};
export type ConversationCategory = "direct" | "group" | "channel";
export const conversationCategory = (
	thread: Conversation,
): ConversationCategory => {
	const kind = conversationKind(thread);
	return kind === "direct" || kind === "group" ? kind : "channel";
};
export const conversationKindLabel = (thread: Conversation): string =>
	({
		general: "Club chat",
		staff: "Staff chat",
		program: "Program",
		event: "Event chat",
		direct: "Direct message",
		group: "Group",
	})[conversationKind(thread)];
export const isDirectThread = (
	thread: Conversation,
	first: string,
	second: string,
): boolean =>
	conversationKind(thread) === "direct" &&
	thread.id !== "club" &&
	thread.id !== "youth" &&
	thread.accountIds.length === 2 &&
	thread.accountIds.includes(first) &&
	thread.accountIds.includes(second);
export const directThreadKey = (first: string, second: string): string =>
	[first, second].slice().sort().join(":");
export const directThreadId = (first: string, second: string): string =>
	`dm-${[first, second].slice().sort().join("-")}`;

export const isReactionEmoji = (value: string): boolean =>
	value.length <= 64 && emojiRegex().exec(value)?.at(0) === value;

export const messagePreview = (message: Message): string =>
	message.deleted ? "Message deleted" : message.body || "Photo";

export const reactionChoices = [
	{ emoji: "👍", label: "Like" },
	{ emoji: "❤️", label: "Love" },
	{ emoji: "😂", label: "Laugh" },
	{ emoji: "😮", label: "Wow" },
	{ emoji: "😢", label: "Sad" },
	{ emoji: "🙏", label: "Thanks" },
] as const;
export const imageLimits = {
	bytes: 5 * 1024 * 1024,
	perMessage: 3,
	pending: 12,
	lifetime: 24 * 60 * 60 * 1000,
} as const;
export type MessageImage = { id: string; name: string; mime?: string };
export type MessageReaction = { emoji: string; accountIds: string[] };
export const imageMime = (bytes: Uint8Array): string | undefined => {
	const starts = (signature: number[]): boolean =>
		signature.every((byte, index) => bytes.at(index) === byte);
	if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
	if (starts([255, 216, 255])) return "image/jpeg";
	if (
		starts([82, 73, 70, 70]) &&
		[87, 69, 66, 80].every((byte, index) => bytes.at(index + 8) === byte)
	)
		return "image/webp";
	return undefined;
};
