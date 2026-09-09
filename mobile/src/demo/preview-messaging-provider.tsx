import { atom, useAtom } from "jotai";
import { type ReactElement, type ReactNode, useCallback } from "react";
import { MessagingContext } from "../backend/messaging-context";
import { directThreadId, isDirectThread } from "../domain/messaging";
import { useApp } from "./app-state";

const readsAtom = atom<Record<string, number>>({});
export const PreviewMessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const { data, account, accounts, dispatch } = useApp();
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
				openDirect: async (recipientId): Promise<string> => {
					const existing = data.conversations.find((thread) =>
						isDirectThread(thread, account.id, recipientId),
					);
					if (existing) return existing.id;
					const id = directThreadId(account.id, recipientId);
					const target = accounts.find((entry) => entry.id === recipientId);
					if (
						!target ||
						!(await dispatch({
							type: "create-thread",
							id,
							recipientId,
							title: target.name,
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
