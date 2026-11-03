import type { ComponentProps, ReactElement } from "react";
import { MessageBubble } from "./message-bubble";
export const MessageRow = (
	props: ComponentProps<typeof MessageBubble>,
): ReactElement => (
	<div className="club-message-row">
		<MessageBubble {...props} />
	</div>
);
