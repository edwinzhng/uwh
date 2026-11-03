import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useMessaging } from "../backend/messaging-context";
import {
	formattedTextPreview,
	List,
	ListItem,
	SummaryCard,
	Text,
} from "../design-system";
import { homeRecentConversations } from "../domain/home-summary";
import { messagePreview } from "../domain/messaging";
import { ConversationAvatar } from "./conversation-avatar";

export const HomeMessages = (): ReactElement => {
	const { threads, loading, error } = useMessaging();
	const router = useRouter();
	const recent = homeRecentConversations(threads);
	return (
		<SummaryCard title="Recent chats" icon="message" category="sky">
			{recent.length ? (
				<List>
					{recent.map((thread) => {
						const preview = thread.latest
							? `${thread.latest.author}: ${formattedTextPreview(messagePreview(thread.latest))}`
							: "";
						return (
							<ListItem
								key={thread.id}
								title={thread.title}
								leading={<ConversationAvatar thread={thread} />}
								titleLines={1}
								description={preview}
								descriptionLines={1}
								emphasis={thread.unread ? "strong" : "subtle"}
								accessibilityLabel={`${thread.title}. ${preview}${thread.unread ? `. ${thread.unread} unread messages` : ""}. Open conversation`}
								onPress={(): void =>
									router.push({
										pathname: "/conversation",
										params: { id: thread.id },
									})
								}
							/>
						);
					})}
				</List>
			) : (
				<Text tone="secondary">
					{loading
						? "Loading messages…"
						: error
							? "Messages are temporarily unavailable."
							: "No recent messages."}
				</Text>
			)}
		</SummaryCard>
	);
};
