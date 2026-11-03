import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	formattedTextPreview,
	ListItem,
	Stack,
	Text,
	UnreadCount,
} from "../design-system";
import { chatFirstName } from "../domain/chat-labels";
import { chatTimeLabel } from "../domain/message-presentation";
import {
	type ConversationSummary,
	conversationActivityAt,
	messagePreview,
} from "../domain/messaging";

import { ConversationAvatar } from "./conversation-avatar";

export const ConversationRow = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const router = useRouter();
	const { data } = useApp();
	const { id } = useGlobalSearchParams<{ id?: string }>();
	const pathname = usePathname();
	return (
		<ListItem
			density="compact"
			title={thread.title}
			selected={id === thread.id}
			titleLines={1}
			emphasis={thread.unread ? "strong" : "subtle"}
			accessibilityLabel={
				thread.unread
					? `${thread.title}, ${thread.unread >= 100 ? "over 99" : thread.unread} unread messages`
					: thread.title
			}
			descriptionLines={1}
			descriptionItalic={thread.latest?.deleted}
			leading={<ConversationAvatar thread={thread} />}
			description={
				thread.latest
					? `${chatFirstName(thread.latest.author)}: ${formattedTextPreview(messagePreview(thread.latest))}`
					: "No messages yet"
			}
			trailing={
				<Stack gap="xxs">
					<Text variant="navigation" tone="secondary">
						{thread.latest
							? chatTimeLabel(conversationActivityAt(thread), data.timeZone)
							: undefined}
					</Text>
					{thread.unread ? <UnreadCount count={thread.unread} /> : undefined}
				</Stack>
			}
			onPress={(): void =>
				pathname === "/conversation"
					? router.replace({
							pathname: "/conversation",
							params: { id: thread.id },
						})
					: router.push({
							pathname: "/conversation",
							params: { id: thread.id },
						})
			}
		/>
	);
};
