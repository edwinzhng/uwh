import { useMutation, useQuery } from "convex/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type ReactElement, type ReactNode, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewGroupPolicyAtom } from "../demo/group-conversation-state";
import {
	closePreviewPollAtom,
	createPreviewPollAtom,
	previewPollAvailable,
	previewToolsAtom,
	votePreviewPollAtom,
} from "../demo/preview-polls-state";
import { summarizePoll } from "../domain/chat-polls";
import {
	type ConversationSummary,
	conversationKind,
} from "../domain/messaging";
import { useChatSafety } from "./chat-safety";
import { ThreadToolsContext } from "./thread-tools-context";

const LiveTools = ({
	thread,
	children,
}: {
	thread: ConversationSummary;
	children: ReactNode;
}): ReactElement => {
	const value = useQuery(api.thread_tools.read, { threadId: thread.id });
	const safety = useChatSafety();
	const create = useMutation(api.thread_tools.create);
	const vote = useMutation(api.thread_tools.vote);
	const close = useMutation(api.thread_tools.close);
	const pin = useMutation(api.thread_tools.pin);
	const readOnly = Boolean(
		safety.status?.paused ||
			(["direct", "group"].includes(conversationKind(thread)) &&
				thread.accountIds.some((id) =>
					safety.status?.unavailableIds.includes(id),
				)),
	);
	return (
		<ThreadToolsContext.Provider
			value={{
				polls: value?.polls ?? [],
				pins: value?.pins ?? [],
				canPin: value?.canPin ?? false,
				loading: value === undefined,
				readOnly,
				create: async (key, draft): Promise<void> => {
					await create({ ...draft, key, threadId: thread.id });
				},
				vote: async (pollId, choices): Promise<void> => {
					await vote({ pollId, choices });
				},
				close: async (pollId): Promise<void> => {
					await close({ pollId });
				},
				pin: async (messageId, pinned): Promise<void> => {
					await pin({ threadId: thread.id, messageId, pinned });
				},
			}}
		>
			{children}
		</ThreadToolsContext.Provider>
	);
};
const PreviewTools = ({
	thread,
	children,
}: {
	thread: ConversationSummary;
	children: ReactNode;
}): ReactElement => {
	const { account, data } = useApp();
	const [state, setState] = useAtom(previewToolsAtom);
	const create = useSetAtom(createPreviewPollAtom);
	const vote = useSetAtom(votePreviewPollAtom);
	const close = useSetAtom(closePreviewPollAtom);
	const policy = useAtomValue(previewGroupPolicyAtom);
	const blocked = policy.blockedPairs.flatMap((pair) =>
		pair.userId === account.id
			? [pair.targetId]
			: pair.targetId === account.id
				? [pair.userId]
				: [],
	);
	const readOnly =
		policy.pausedIds.includes(account.id) ||
		(["direct", "group"].includes(conversationKind(thread)) &&
			thread.accountIds.some((id) => blocked.includes(id)));
	useEffect(() => {
		const next = state.polls
			.filter((poll) => !poll.closedAt && poll.closesAt !== undefined)
			.map((poll) => poll.closesAt ?? 0)
			.slice()
			.sort((a, b) => a - b)
			.at(0);
		if (next === undefined) return;
		const timer = setTimeout(
			(): void =>
				setState((current) => ({
					...current,
					polls: current.polls.map((poll) =>
						!poll.closedAt &&
						poll.closesAt !== undefined &&
						poll.closesAt <= Date.now()
							? { ...poll, closedAt: poll.closesAt }
							: poll,
					),
				})),
			Math.max(0, Math.min(next - Date.now(), 2147483647)),
		);
		return (): void => clearTimeout(timer);
	}, [state.polls, setState]);
	const staff = account.admin || account.coachPrograms.length > 0;
	const canPin =
		staff || ["direct", "group"].includes(conversationKind(thread));
	const pins = (state.pins[thread.id] ?? []).filter((id) =>
		data.messages.some((message) => message.id === id && !message.deleted),
	);
	return (
		<ThreadToolsContext.Provider
			value={{
				polls: state.polls
					.filter(
						(poll) =>
							poll.threadId === thread.id &&
							!blocked.includes(poll.createdBy) &&
							previewPollAvailable(data, poll),
					)
					.slice()
					.sort(
						(first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0),
					)
					.slice(0, 40)
					.map((poll) => summarizePoll(poll, account.id, staff)),
				pins: data.messages.filter(
					(message) => pins.includes(message.id) && !message.deleted,
				),
				canPin,
				loading: false,
				readOnly,
				create: async (key, draft): Promise<void> =>
					create({ threadId: thread.id, key, draft }),
				vote: async (pollId, choices): Promise<void> =>
					vote({ threadId: thread.id, pollId, choices }),
				close: async (pollId): Promise<void> =>
					close({ threadId: thread.id, pollId }),
				pin: async (messageId, pinned): Promise<void> => {
					if (readOnly) throw new Error("Messaging unavailable");
					if (!canPin) throw new Error("Club staff manage pinned messages");
					if (
						!data.messages.some(
							(message) =>
								message.id === messageId &&
								message.threadId === thread.id &&
								!message.deleted,
						)
					)
						throw new Error("Message unavailable");
					if (pinned && !pins.includes(messageId) && pins.length >= 3)
						throw new Error("Unpin a message first");
					setState((current) => ({
						...current,
						pins: {
							...current.pins,
							[thread.id]: pinned
								? [...new Set([...(current.pins[thread.id] ?? []), messageId])]
								: (current.pins[thread.id] ?? []).filter(
										(id) => id !== messageId,
									),
						},
					}));
				},
			}}
		>
			{children}
		</ThreadToolsContext.Provider>
	);
};
export const ThreadToolsProvider = ({
	thread,
	children,
}: {
	thread: ConversationSummary;
	children: ReactNode;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveTools thread={thread}>{children}</LiveTools>
	) : (
		<PreviewTools thread={thread}>{children}</PreviewTools>
	);
