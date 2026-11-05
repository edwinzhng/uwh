import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useMemo, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import {
	Button,
	ChatIdentity,
	MessageTimeline,
	Row,
	Stack,
	Text,
} from "../design-system";
import { chatHeaderTitle } from "../domain/chat-labels";
import { messagePresentations } from "../domain/message-presentation";
import {
	type ConversationSummary,
	conversationKind,
	type ThreadMessage,
} from "../domain/messaging";
import { ClubShell } from "./club-shell";
import { ConversationAvatar } from "./conversation-avatar";
import { MessageComposer } from "./message-composer";
import { MessageItem } from "./message-item";
import { ThreadExtras } from "./thread-extras";
import { ThreadParticipantsHeader } from "./thread-participants-header";
import { ThreadPractice } from "./thread-practice";
import { useMessageReadState } from "./use-message-read-state";

export type ThreadContentProps = {
	thread: ConversationSummary;
	messages: ThreadMessage[];
	loading: boolean;
	loadingMore: boolean;
	canLoadMore: boolean;
	onLoadMore: () => void;
};
export const ThreadContent = ({
	thread,
	messages,
	loading,
	loadingMore,
	canLoadMore,
	onLoadMore,
}: ThreadContentProps): ReactElement => {
	const { account, source, data } = useApp();
	const router = useRouter();
	const { fromEvent } = useLocalSearchParams<{ fromEvent?: string }>();
	const safety = useChatSafety();
	const [replyId, setReplyId] = useState<string>();
	const [latestVisible, setLatestVisible] = useState<string>();
	const read = useMessageReadState(
		thread.id,
		messages.at(0),
		latestVisible === messages.at(0)?.id,
	);
	const blocked =
		["direct", "group"].includes(conversationKind(thread)) &&
		thread.accountIds.some((id) => safety.status?.unavailableIds.includes(id));
	const readOnly = safety.status?.paused || blocked;
	const reply = messages.find((message) => message.id === replyId);
	const showAuthors = conversationKind(thread) !== "direct";
	const presentation = useMemo(
		() =>
			messagePresentations(messages, {
				accountId: account.id,
				showAuthors,
				hasOlderMessages: canLoadMore || loadingMore,
				timeZone: data.timeZone,
			}),
		[
			messages,
			account.id,
			showAuthors,
			canLoadMore,
			loadingMore,
			data.timeZone,
		],
	);
	return (
		<ClubShell
			contentLoading={loading}
			presentation="workspace"
			action={<ThreadParticipantsHeader thread={thread} />}
			title={thread.title}
			workspaceTitle={
				<ThreadParticipantsHeader
					thread={thread}
					trigger={(onOpen): ReactElement => (
						<ChatIdentity
							onPress={onOpen}
							avatar={<ConversationAvatar thread={thread} />}
							title={chatHeaderTitle(thread, [
								...data.members.map((member) => member.name),
								...(thread.participants ?? []).map((person) => person.name),
							])}
						/>
					)}
				/>
			}
			scrollable={false}
			back={
				<Row gap="xxs">
					<Button
						label={fromEvent ? "Back to practice" : "Chats"}
						icon="arrowLeft"
						variant="ghost"
						onPress={(): void => {
							if (fromEvent && router.canGoBack()) router.back();
							else if (fromEvent)
								router.replace({
									pathname: "/session",
									params: { event: fromEvent },
								});
							else router.dismissTo("/messages");
						}}
					/>
				</Row>
			}
			footer={
				readOnly ? (
					<Stack padding="sm">
						<Text variant="small" tone="secondary">
							{safety.status?.paused
								? "Chat access paused. Contact a club admin."
								: "Messaging is unavailable between these accounts."}
						</Text>
					</Stack>
				) : (
					<MessageComposer
						key={`${source}:${account.id}:${thread.id}`}
						threadId={thread.id}
						replyToId={replyId}
						reply={reply}
						onClearReply={(): void => setReplyId(undefined)}
					/>
				)
			}
		>
			<Stack grow gap="none">
				{read.error ? (
					<Row justify="between">
						<Text variant="caption" tone="danger">
							Couldn’t update read status.
						</Text>
						<Button label="Retry" variant="ghost" onPress={read.retry} />
					</Row>
				) : undefined}
				<MessageTimeline
					topOverlay={
						<>
							<ThreadPractice threadId={thread.id} />
							<ThreadExtras />
						</>
					}
					items={messages}
					loading={loading}
					loadingMore={loadingMore}
					canLoadMore={canLoadMore}
					onLoadMore={onLoadMore}
					onLatestVisible={setLatestVisible}
					renderItem={(message): ReactElement => (
						<MessageItem
							message={message}
							reply={message.reply}
							showAuthor={presentation.get(message.id)?.showAuthor ?? false}
							timeLabel={presentation.get(message.id)?.timeLabel}
							onReply={setReplyId}
						/>
					)}
				/>
			</Stack>
		</ClubShell>
	);
};
