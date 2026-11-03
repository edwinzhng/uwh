import type { ReactElement } from "react";
import { formattedTextPreview, MessageReply } from "../design-system";
import type { Message } from "../domain/app-types";
import { messagePreview } from "../domain/messaging";

export const MessageQuote = ({
	message,
}: {
	message?: Message;
}): ReactElement => (
	<MessageReply
		author={message && !message.deleted ? message.author : undefined}
		preview={
			message
				? formattedTextPreview(messagePreview(message)).slice(0, 160)
				: "Message unavailable"
		}
	/>
);
