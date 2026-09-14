import { atom, useAtom, useSetAtom } from "jotai";
import { type ReactElement, type ReactNode, useCallback } from "react";
import { MessagingContext } from "../backend/messaging-context";
import {
	accountForRecipient,
	recipientPersonId,
} from "../domain/message-recipients";
import { directThreadId, isDirectThread } from "../domain/messaging";
import {
	canDiscussSession,
	sessionThreadId,
} from "../domain/session-discussion";
import { previewDataAtom, useApp } from "./app-state";

const readsAtom = atom<Record<string, number>>({});
export const PreviewMessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const { data, account, accounts, dispatch } = useApp();
	const setData = useSetAtom(previewDataAtom);
	const [reads, setReads] = useAtom(readsAtom);
	const markRead = useCallback(
		async (threadId: string, messageId: string): Promise<void> => {
			const through =
				data.messages.findIndex(
					(message) =>
						message.id === messageId && message.threadId === threadId,
				) + 1;
			const key = `${account.id}:${threadId}`;
			setReads((current) => ({
				...current,
				[key]: Math.max(current[key] ?? 0, through),
			}));
		},
		[data.messages, account.id, setReads],
	);
	return (
		<MessagingContext.Provider
			value={{
				loading: false,
				threads: data.conversations
					.map((thread) => {
						const messages = data.messages
							.map((message, index) => ({ ...message, createdAt: index + 1 }))
							.filter((message) => message.threadId === thread.id);
						const readThrough = reads[`${account.id}:${thread.id}`] ?? 0;
						const other =
							!thread.eventId &&
							!thread.id.startsWith("session:") &&
							thread.accountIds.length === 2 &&
							!["club", "youth"].includes(thread.id)
								? accounts.find(
										(entry) =>
											entry.id !== account.id &&
											thread.accountIds.includes(entry.id),
									)
								: undefined;
						return {
							...thread,
							title: other?.name ?? thread.title,
							latest: messages.at(-1),
							updatedAt: messages.at(-1)?.createdAt ?? 0,
							readThrough,
							unread: messages.filter(
								(message) =>
									message.createdAt > readThrough &&
									message.accountId !== account.id &&
									!message.deleted,
							).length,
						};
					})
					.toSorted((a, b) => b.updatedAt - a.updatedAt),
				markRead,
				openSession: async (eventId): Promise<string> => {
					const event = data.events.find((entry) => entry.id === eventId);
					if (!event || !canDiscussSession(account, event, data.members))
						throw new Error("Session discussion unavailable.");
					const id = sessionThreadId(eventId);
					setData((current) => {
						const accountIds = accounts
							.filter((entry) =>
								canDiscussSession(entry, event, current.members),
							)
							.map((entry) => entry.id);
						const thread = {
							id,
							eventId,
							title: event.title,
							subtitle: `${event.date} · Session discussion`,
							accountIds,
						};
						return {
							...current,
							conversations: [
								...current.conversations.filter((entry) => entry.id !== id),
								thread,
							],
						};
					});
					return id;
				},
				openDirect: async (recipientId): Promise<string> => {
					const personId = recipientPersonId(recipientId);
					const person = data.members.find((entry) => entry.id === personId);
					const target = personId
						? accountForRecipient(accounts, personId, account.id)
						: accounts.find((entry) => entry.id === recipientId);
					const resolvedId = target?.id ?? recipientId;
					const existing = data.conversations.find((thread) =>
						isDirectThread(thread, account.id, resolvedId),
					);
					if (existing) return existing.id;
					const id = directThreadId(account.id, resolvedId);
					if (
						(!target && !person) ||
						!(await dispatch({
							type: "create-thread",
							id,
							recipientId: resolvedId,
							title: person?.name ?? target?.name ?? "Member",
						}))
					)
						throw new Error("Could not open conversation.");
					return id;
				},
			}}
		>
			{children}
		</MessagingContext.Provider>
	);
};
