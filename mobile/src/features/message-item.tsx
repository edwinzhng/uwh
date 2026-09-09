import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Avatar, Row, Stack, Text } from "../design-system";
import type { Message } from "../domain/app-types";
import { MessageActions } from "./message-actions";
import { MessagePhoto } from "./message-photo";
import { MessageQuote } from "./message-quote";
import { MessageReactions } from "./message-reactions";

export const MessageItem = ({
	message,
	reply,
	onReply,
}: {
	message: Message;
	reply?: Message;
	onReply: () => void;
}): ReactElement => {
	const { account } = useApp();
	return (
		<Row align="start">
			<Avatar name={message.author} />
			<Stack grow gap="xs">
				<Row gap="xs" wrap>
					<Text variant="label">
						{message.accountId === account.id ? "You" : message.author}
					</Text>
					<Text variant="caption" tone="secondary">
						{message.time}
						{message.edited && !message.deleted ? " · Edited" : ""}
					</Text>
				</Row>
				{message.replyToId ? <MessageQuote message={reply} /> : undefined}
				{message.deleted ? (
					<Text variant="small" tone="secondary">
						Message deleted
					</Text>
				) : message.body ? (
					<Text variant="small" selectable>
						{message.body}
					</Text>
				) : undefined}
				{message.images?.map((image) => (
					<MessagePhoto key={image.id} image={image} />
				))}
				{!message.deleted ? <MessageReactions message={message} /> : undefined}
			</Stack>
			{!message.deleted ? (
				<MessageActions message={message} onReply={onReply} />
			) : undefined}
		</Row>
	);
};
