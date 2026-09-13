import { useMutation, useQuery } from "convex/react";
import { type ReactElement, type ReactNode, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { MessagingContext } from "./messaging-context";

export const LiveMessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const threads = useQuery(api.messaging.inbox, {});
	const open = useMutation(api.messaging.openDirect);
	const openSession = useMutation(api.messaging.openSession);
	const read = useMutation(api.messaging.markRead);
	const openDirect = useCallback(
		(recipientId: string): Promise<string> => open({ recipientId }),
		[open],
	);
	const markRead = useCallback(
		async (threadId: string, messageId: string): Promise<void> => {
			await read({ threadId, messageId });
		},
		[read],
	);
	return (
		<MessagingContext.Provider
			value={{
				threads: threads ?? [],
				loading: threads === undefined,
				openDirect,
				openSession: (eventId): Promise<string> => openSession({ eventId }),
				markRead,
			}}
		>
			{children}
		</MessagingContext.Provider>
	);
};
