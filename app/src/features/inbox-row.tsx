import type { ReactElement } from "react";
import { type IconName, ListItem, Text } from "../design-system";
import { displayDate } from "../domain/date-display";
import type { InboxItem, InboxKind } from "../domain/inbox";

const inboxIcons: Record<InboxKind, IconName> = {
	messages: "message",
	events: "calendar",
	feedback: "target",
	announcements: "megaphone",
};
export const InboxRow = ({
	item,
	busy,
	onOpen,
}: {
	item: InboxItem;
	busy: boolean;
	onOpen: () => void;
}): ReactElement => (
	<ListItem
		title={item.title}
		description={item.description}
		descriptionLines={2}
		trailing={
			<Text variant="caption" tone="secondary">
				{displayDate(item.createdAt)}
			</Text>
		}
		icon={
			item.topic === "video"
				? "image"
				: item.topic === "document" || item.topic === "sessionPlan"
					? "list"
					: item.topic === "lineup"
						? "layers"
						: inboxIcons[item.kind]
		}
		emphasis={item.readAt ? "subtle" : "strong"}
		accessibilityLabel={`${item.title}${item.readAt ? "" : ", unread"}`}
		onPress={busy ? undefined : onOpen}
	/>
);
