import { useMutation, useQuery } from "convex/react";
import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import { api } from "../../convex/_generated/api";
import { friendlyError } from "./errors";
import { MessagingContext } from "./messaging-context";

export const LiveMessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const threads = useQuery(api.messaging.inbox, {});
	const ensureGeneral = useMutation(api.messaging.ensureGeneral);
	const [error, setError] = useState<string>();
	const synchronize = useCallback((): void => {
		setError(undefined);
		void ensureGeneral({}).catch((failure: unknown) =>
			setError(friendlyError(failure)),
		);
	}, [ensureGeneral]);
	useEffect(synchronize, [synchronize]);
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
				error,
				retry: synchronize,
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
