import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import {
	type RecipientDirectory,
	recipientDirectory,
} from "../domain/message-recipients";
export const useLiveMessageRecipients = (): RecipientDirectory | undefined =>
	useQuery(api.message_recipients.directory, {});
export const usePreviewMessageRecipients = (): RecipientDirectory => {
	const { accounts, account, data } = useApp();
	const { status } = useChatSafety();
	return recipientDirectory(
		accounts,
		data.members,
		account.id,
		status?.unavailableIds ?? [],
		status?.paused ?? false,
	);
};
