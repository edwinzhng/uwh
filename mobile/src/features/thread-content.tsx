import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import { Button, MessageTimeline, Row, Stack, Text } from "../design-system";
import type { ConversationSummary, ThreadMessage } from "../domain/messaging";
import { ClubShell } from "./club-shell";
import { MessageComposer } from "./message-composer";
import { MessageItem } from "./message-item";
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
	const { account, source } = useApp();
	const router = useRouter();
	const safety = useChatSafety();
	const [replyId, setReplyId] = useState<string>();
	const [latestVisible, setLatestVisible] = useState<string>();
	const read = useMessageReadState(
		thread.id,
		messages.at(0),
		latestVisible === messages.at(0)?.id,
	);
	const blocked =
		!["club", "youth"].includes(thread.id) &&
		thread.accountIds.some((id) => safety.status?.unavailableIds.includes(id));
	const readOnly = safety.status?.paused || blocked;
	const reply = messages.find((message) => message.id === replyId);
	return (
		<ClubShell
			title={thread.title}
			scrollable={false}
			back={
				<Button
					label="Messages"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/messages")}
				/>
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
			{read.error ? (
				<Row justify="between">
					<Text variant="caption" tone="danger">
						Couldn’t update read status.
					</Text>
					<Button label="Retry" variant="ghost" onPress={read.retry} />
				</Row>
			) : undefined}
			<MessageTimeline
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
						onReply={(): void => setReplyId(message.id)}
					/>
				)}
			/>
		</ClubShell>
	);
};
