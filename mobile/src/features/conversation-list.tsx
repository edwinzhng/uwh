import { type ReactElement, useState } from "react";
import { useMessaging } from "../backend/messaging-context";
import {
	Button,
	EmptyState,
	Field,
	List,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { conversationKind } from "../domain/messaging";

import { ConversationRow } from "./conversation-row";

export const ConversationList = (): ReactElement => {
	const { threads, loading, error, retry } = useMessaging();
	const [search, setSearch] = useState("");
	const visible = threads.filter((thread) =>
		thread.title.toLowerCase().includes(search.trim().toLowerCase()),
	);
	return (
		<Stack>
			{error ? (
				<Row wrap>
					<Text tone="danger">{error}</Text>
					{retry ? (
						<Button
							label="Retry loading chats"
							variant="secondary"
							onPress={retry}
						/>
					) : undefined}
				</Row>
			) : undefined}
			<Field
				label="Search"
				placeholder="Find a conversation"
				value={search}
				onValueChange={setSearch}
			/>

			{visible.length ? (
				[
					{
						title: "Conversations",
						threads: visible.filter(
							(thread) => conversationKind(thread) !== "direct",
						),
					},
					{
						title: "Direct messages",
						threads: visible.filter(
							(thread) => conversationKind(thread) === "direct",
						),
					},
				]
					.filter((section) => section.threads.length)
					.map((section) => (
						<Stack key={section.title} gap="sm">
							<SectionHeading size="small">{section.title}</SectionHeading>
							<Surface padding="xs">
								<List>
									{section.threads.map((thread) => (
										<ConversationRow key={thread.id} thread={thread} />
									))}
								</List>
							</Surface>
						</Stack>
					))
			) : loading ? (
				<LoadingContent />
			) : (
				<EmptyState
					title={
						search.trim() ? "No conversations found" : "No conversations yet"
					}
					description={
						search.trim()
							? "Try another name or clear your search."
							: "Start a message or open a session discussion to begin a conversation."
					}
				/>
			)}
		</Stack>
	);
};
