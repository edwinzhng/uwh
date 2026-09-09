import { canReadThread } from "./app-rules";
import type { Account, AppAction, AppData } from "./app-types";
import { imageLimits, isDirectThread, isReactionEmoji } from "./messaging";

export type MessageAction = Extract<
	AppAction,
	{
		type:
			| "send-message"
			| "edit-message"
			| "delete-message"
			| "set-reaction"
			| "create-thread";
	}
>;
type MessageData = Pick<AppData, "conversations" | "messages">;
const requireAccess = (allowed: boolean): void => {
	if (!allowed) throw new Error("You don’t have access to this action.");
};
export const reduceMessages = (
	data: MessageData,
	account: Account,
	action: MessageAction,
): MessageData => {
	switch (action.type) {
		case "send-message": {
			const thread = data.conversations.find(
				(entry) => entry.id === action.threadId,
			);
			requireAccess(Boolean(thread && canReadThread(account, thread)));
			const reply = action.replyToId
				? data.messages.find((message) => message.id === action.replyToId)
				: undefined;
			if (
				action.replyToId &&
				(!reply || reply.deleted || reply.threadId !== action.threadId)
			)
				throw new Error("Choose an available message in this conversation.");
			if (action.body.length > 5000)
				throw new Error("Keep messages under 5,000 characters.");
			if (!action.body.trim() && !action.images?.length)
				throw new Error("Add a message or photo.");
			if (
				(action.images?.length ?? 0) > imageLimits.perMessage ||
				new Set(action.images?.map((image) => image.id)).size !==
					(action.images?.length ?? 0)
			)
				throw new Error("Choose up to three different photos.");
			if (data.messages.some((entry) => entry.id === action.id)) return data;
			return {
				...data,
				messages: [
					...data.messages,
					{
						id: action.id,
						threadId: action.threadId,
						body: action.body.trim().slice(0, 5000),
						time: action.time,
						accountId: account.id,
						author: account.name,
						...(reply ? { replyToId: reply.id } : {}),
						...(action.images?.length ? { images: action.images } : {}),
					},
				],
			};
		}
		case "edit-message":
		case "delete-message": {
			const message = data.messages.find(
				(entry) => entry.id === action.messageId,
			);
			const thread = data.conversations.find(
				(entry) => entry.id === message?.threadId,
			);
			requireAccess(
				Boolean(
					message &&
						message.accountId === account.id &&
						thread &&
						canReadThread(account, thread),
				),
			);
			if (!message) throw new Error("Message unavailable.");
			if (action.type === "delete-message") {
				if (message.deleted) return data;
				return {
					...data,
					messages: data.messages.map((entry) =>
						entry.id === message.id
							? {
									id: entry.id,
									threadId: entry.threadId,
									accountId: entry.accountId,
									author: entry.author,
									time: entry.time,
									body: "",
									deleted: true,
								}
							: entry,
					),
				};
			}
			if (message.deleted) throw new Error("Message was deleted.");
			if (
				(!action.body.trim() && !message.images?.length) ||
				action.body.length > 5000
			)
				throw new Error("Add a message under 5,000 characters.");
			if (message.body === action.body.trim()) return data;
			return {
				...data,
				messages: data.messages.map((entry) =>
					entry.id === message.id
						? { ...entry, body: action.body.trim(), edited: true }
						: entry,
				),
			};
		}
		case "set-reaction": {
			const message = data.messages.find(
				(entry) => entry.id === action.messageId,
			);
			const thread = data.conversations.find(
				(entry) => entry.id === message?.threadId,
			);
			requireAccess(
				Boolean(
					message &&
						!message.deleted &&
						thread &&
						canReadThread(account, thread),
				),
			);
			if (!isReactionEmoji(action.emoji)) throw new Error("Choose a reaction.");
			const reactions = message?.reactions ?? [];
			const others =
				reactions
					.find((reaction) => reaction.emoji === action.emoji)
					?.accountIds.filter((id) => id !== account.id) ?? [];
			const accountIds = action.active ? [...others, account.id] : others;
			const updated = [
				...reactions.filter((reaction) => reaction.emoji !== action.emoji),
				...(accountIds.length ? [{ emoji: action.emoji, accountIds }] : []),
			].toSorted((a, b) => a.emoji.localeCompare(b.emoji));
			return {
				...data,
				messages: data.messages.map((entry) =>
					entry.id === action.messageId
						? { ...entry, reactions: updated }
						: entry,
				),
			};
		}
		case "create-thread":
			if (
				!action.title.trim() ||
				!action.recipientId ||
				action.recipientId === account.id
			)
				throw new Error("Choose another club account.");
			if (
				data.conversations.some(
					(entry) =>
						entry.id === action.id ||
						isDirectThread(entry, account.id, action.recipientId),
				)
			)
				return data;
			return {
				...data,
				conversations: [
					...data.conversations,
					{
						id: action.id,
						title: action.title.trim(),
						subtitle: "Direct message",
						accountIds: [account.id, action.recipientId],
					},
				],
			};
	}
};
