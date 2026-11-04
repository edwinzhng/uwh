import { type ReactElement, type ReactNode, useState } from "react";
import { useMessaging } from "../backend/messaging-context";
import {
	Button,
	EmptyState,
	Field,
	List,
	LoadingContent,
	Row,
	Stack,
	Tabs,
	Text,
} from "../design-system";
import {
	type ChatFilter,
	filteredConversations,
} from "../domain/conversation-sections";

import { ConversationRow } from "./conversation-row";

export const ConversationList = ({
	action,
}: {
	action?: ReactNode;
}): ReactElement => {
	const { threads, loading, error, retry } = useMessaging();
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<ChatFilter>("all");
	const visible = filteredConversations(threads, search, filter);
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
			<Row gap="xs">
				<Stack grow>
					<Field
						label="Search"
						hideLabel
						inputMode="search"
						placeholder="Search chats"
						value={search}
						onValueChange={setSearch}
					/>
				</Stack>
				{action}
			</Row>
			<Tabs
				label="Chat filters"
				value={filter}
				onValueChange={setFilter}
				options={[
					{ value: "all", label: "All" },
					{ value: "unread", label: "Unread" },
					{ value: "group", label: "Groups" },
					{ value: "channel", label: "Programs" },
				]}
			/>
			{visible.length ? (
				<List separators="leading">
					{visible.map((thread) => (
						<ConversationRow key={thread.id} thread={thread} />
					))}
				</List>
			) : loading ? (
				<LoadingContent />
			) : (
				<EmptyState
					title={
						search.trim()
							? "No matching chats"
							: filter === "unread"
								? "No unread chats"
								: "No chats"
					}
				/>
			)}
		</Stack>
	);
};
