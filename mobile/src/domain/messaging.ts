import emojiRegex from "emoji-regex";
import type { Conversation, Message } from "./app-types";

export type ThreadMessage = Message & { createdAt: number; reply?: Message };
export type ConversationSummary = Conversation & {
	latest?: Message;
	updatedAt: number;
	unread: number;
	readThrough: number;
};
export const messagePageSize = 40;
export const isDirectThread = (
	thread: Conversation,
	first: string,
	second: string,
): boolean =>
	!thread.eventId &&
	!thread.id.startsWith("session:") &&
	thread.id !== "club" &&
	thread.id !== "youth" &&
	thread.accountIds.length === 2 &&
	thread.accountIds.includes(first) &&
	thread.accountIds.includes(second);
export const directThreadKey = (first: string, second: string): string =>
	[first, second].toSorted().join(":");
export const directThreadId = (first: string, second: string): string =>
	`dm-${[first, second].toSorted().join("-")}`;

export const isReactionEmoji = (value: string): boolean =>
	value.length <= 64 && emojiRegex().exec(value)?.at(0) === value;

export const messagePreview = (message: Message): string =>
	message.deleted ? "Message deleted" : message.body || "Photo";

export const reactionChoices = [
	{ emoji: "❤️", label: "Love" },
	{ emoji: "👍", label: "Like" },
	{ emoji: "🎉", label: "Celebrate" },
	{ emoji: "😂", label: "Laugh" },
	{ emoji: "🐊", label: "Crocodile" },
] as const;
export const imageLimits = {
	bytes: 5 * 1024 * 1024,
	perMessage: 3,
	pending: 12,
	lifetime: 24 * 60 * 60 * 1000,
} as const;
export type MessageImage = { id: string; name: string };
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
