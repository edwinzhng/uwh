import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useMessaging } from "../backend/messaging-context";
import {
	Badge,
	Field,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { messagePreview } from "../domain/messaging";

export const ConversationList = (): ReactElement => {
	const { threads, loading } = useMessaging();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const visible = threads.filter((thread) =>
		thread.title.toLowerCase().includes(search.trim().toLowerCase()),
	);
	return (
		<Stack>
			<Field
				label="Search"
				placeholder="Find a conversation"
				value={search}
				onValueChange={setSearch}
			/>
			<Surface padding="xs">
				<Stack gap="xxs">
					{visible.map((thread) => (
						<ListItem
							key={thread.id}
							title={thread.title}
							accessibilityLabel={
								thread.unread
									? `${thread.title}, ${thread.unread >= 100 ? "over 99" : thread.unread} unread messages`
									: thread.title
							}
							descriptionLines={1}
							avatar={thread.title}
							description={
								thread.latest
									? `${thread.latest.author.split(" ").at(0)}: ${messagePreview(thread.latest)}`
									: "No messages yet"
							}
							trailing={
								<Row gap="xs">
									<Text variant="caption" tone="secondary">
										{thread.latest?.time}
									</Text>
									{thread.unread ? (
										<Badge
											label={
												thread.unread >= 100 ? "99+" : String(thread.unread)
											}
											kind="info"
										/>
									) : undefined}
								</Row>
							}
							onPress={(): void =>
								router.push({
									pathname: "/conversation",
									params: { id: thread.id },
								})
							}
						/>
					))}
					{!visible.length ? (
						<Text variant="small" tone="secondary">
							{loading ? "Loading conversations…" : "No conversations found."}
						</Text>
					) : undefined}
				</Stack>
			</Surface>
		</Stack>
	);
};
