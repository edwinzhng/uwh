import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Badge, ListItem, Stack, Text } from "../design-system";
import {
	type ConversationSummary,
	conversationKind,
	conversationKindLabel,
	messagePreview,
} from "../domain/messaging";

export const ConversationRow = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const router = useRouter();
	const kind = conversationKind(thread);
	return (
		<ListItem
			title={thread.title}
			titleAccessory={
				kind === "direct" ? undefined : (
					<Badge label={conversationKindLabel(thread)} compact />
				)
			}
			accessibilityLabel={
				thread.unread
					? `${thread.title}, ${thread.unread >= 100 ? "over 99" : thread.unread} unread messages`
					: thread.title
			}
			descriptionLines={1}
			descriptionItalic={thread.latest?.deleted}
			avatar={kind === "direct" ? thread.title : undefined}
			icon={
				kind === "event" ? "calendar" : kind === "direct" ? undefined : "users"
			}
			description={
				thread.latest
					? `${thread.latest.author.split(" ").at(0)}: ${messagePreview(thread.latest)}`
					: "No messages yet"
			}
			trailing={
				<Stack gap="xxs">
					<Text variant="caption" tone="secondary">
						{thread.latest?.time}
					</Text>
					{thread.unread ? (
						<Badge
							label={thread.unread >= 100 ? "99+" : String(thread.unread)}
							kind="info"
						/>
					) : undefined}
				</Stack>
			}
			onPress={(): void =>
				router.push({ pathname: "/conversation", params: { id: thread.id } })
			}
		/>
	);
};
