import { memo, type ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	type ContextMenuControls,
	FormattedText,
	MessagePhotoGrid,
	MessageReactionTrigger,
	MessageRow,
	Stack,
	Text,
} from "../design-system";
import type { Message } from "../domain/app-types";
import { chatFirstName } from "../domain/chat-labels";
import { messageClockLabel } from "../domain/message-presentation";
import { ChatPollMessage } from "./chat-poll-message";
import { MessageActions } from "./message-actions";
import { MessagePhoto } from "./message-photo";
import { MessageQuote } from "./message-quote";
import { MessageReactions } from "./message-reactions";
import { useMessageReaction } from "./use-message-reaction";

export const MessageItem = memo(
	({
		message,
		reply,
		onReply,
		showAuthor,
		timeLabel,
	}: {
		message: Message;
		reply?: Message;
		onReply: (messageId: string) => void;
		showAuthor: boolean;
		timeLabel?: string;
	}): ReactElement => {
		const { account, accounts, data } = useApp();
		const reaction = useMessageReaction(message);
		const outgoing = message.accountId === account.id;
		const renderMessage = (menu?: ContextMenuControls): ReactElement => (
			<MessageRow
				outgoing={outgoing}
				stamp={messageClockLabel(message, data.timeZone)}
				stampGap={message.pollId ? "lg" : undefined}
				avatarLabel={outgoing ? undefined : message.author}
				authorId={
					accounts.find((entry) => entry.id === message.accountId)?.personId
				}
				reactionOpen={reaction.isOpen}
				reactions={
					!message.deleted ? (
						<MessageReactions message={message} controls={reaction} />
					) : undefined
				}
				timeLabel={timeLabel}
				authorLabel={showAuthor ? chatFirstName(message.author) : undefined}
				actions={menu?.trigger}
				actionsFocused={menu?.triggerFocused}
				contextSurface={menu?.surface}
				reaction={
					menu ? (
						<MessageReactionTrigger
							outgoing={outgoing}
							isOpen={reaction.isOpen}
							isDisabled={reaction.pending}
							mode={reaction.mode}
							error={reaction.error}
							recent={reaction.recent}
							selected={reaction.selected}
							onClose={reaction.close}
							onAll={reaction.openAll}
							onSelect={(emoji): void => {
								void reaction.react(emoji).then((saved): void => {
									if (saved) reaction.close();
								});
							}}
							onPress={reaction.open}
							onShowActions={menu.open}
						/>
					) : undefined
				}
			>
				<Stack gap="xs">
					{message.replyToId ? <MessageQuote message={reply} /> : undefined}
					{message.deleted ? (
						<Text variant="small" tone="secondary" italic>
							Message deleted
						</Text>
					) : message.pollId ? (
						<ChatPollMessage
							pollId={message.pollId}
							threadId={message.threadId}
						/>
					) : message.body ? (
						<FormattedText>{message.body}</FormattedText>
					) : undefined}
					<MessagePhotoGrid
						items={
							message.images?.map((image) => ({
								id: image.id,
								content: <MessagePhoto image={image} />,
							})) ?? []
						}
					/>
					{message.edited && !message.deleted ? (
						<Text variant="caption" tone="secondary">
							Edited
						</Text>
					) : undefined}
				</Stack>
			</MessageRow>
		);
		return message.deleted ? (
			renderMessage()
		) : (
			<MessageActions
				message={message}
				onReply={(): void => onReply(message.id)}
				reaction={reaction}
			>
				{renderMessage}
			</MessageActions>
		);
	},
);
