import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useMessaging } from "../backend/messaging-context";
import { useApp } from "../demo/app-state";
import { Button, EmptyState, LoadingContent } from "../design-system";
import { ClubShell } from "./club-shell";
import { LiveConversation } from "./live-conversation";
import { PreviewConversation } from "./preview-conversation";

export const ConversationScreen = (): ReactElement => {
	const { id } = useLocalSearchParams<{ id?: string }>();
	const { account, source } = useApp();
	const { threads, loading } = useMessaging();
	const router = useRouter();
	const thread = threads.find((entry) => entry.id === id);
	if (!thread)
		return (
			<ClubShell
				title="Messages"
				back={
					<Button
						label="Messages"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/messages")}
					/>
				}
			>
				{loading ? (
					<LoadingContent />
				) : (
					<EmptyState
						title="Conversation unavailable"
						description="Return to Messages to choose a conversation you can access."
					/>
				)}
			</ClubShell>
		);
	const key = `${account.id}:${thread.id}`;
	return source === "convex" ? (
		<LiveConversation key={key} thread={thread} />
	) : (
		<PreviewConversation key={key} thread={thread} />
	);
};
