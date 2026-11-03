import { createContext, useContext } from "react";
import type { GroupDraft } from "../domain/group-conversation";
import type { ConversationSummary } from "../domain/messaging";

type Messaging = {
	error?: string;
	retry?: () => void;
	threads: ConversationSummary[];
	loading: boolean;
	openSession: (eventId: string) => Promise<string>;
	openDirect: (recipientId: string) => Promise<string>;
	createGroup: (draft: GroupDraft) => Promise<string>;
	markRead: (threadId: string, messageId: string) => Promise<void>;
};
export const MessagingContext = createContext<Messaging | undefined>(undefined);
export const useMessaging = (): Messaging => {
	const value = useContext(MessagingContext);
	if (!value) throw new Error("MessagingProvider is required.");
	return value;
};
