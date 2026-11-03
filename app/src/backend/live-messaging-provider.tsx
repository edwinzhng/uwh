import { useMutation, useQuery } from "convex/react";
import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { roomRegistryRevision } from "../domain/managed-rooms";
import { useClubToday } from "../features/use-club-today";
import { friendlyError } from "./errors";
import { MessagingContext } from "./messaging-context";

export const LiveMessagingProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const threads = useQuery(api.messaging.inbox, {});
	const { data } = useApp();
	const today = useClubToday();
	const programRevision = useMemo(
		() =>
			roomRegistryRevision(
				{ programs: data.programs, seasons: data.seasons },
				today,
			),
		[data.programs, data.seasons, today],
	);
	const ensureGeneral = useMutation(api.messaging.ensureGeneral);
	const [error, setError] = useState<string>();
	const synchronize = useCallback((): void => {
		setError(undefined);
		void ensureGeneral({}).catch((failure: unknown) =>
			setError(friendlyError(failure)),
		);
	}, [ensureGeneral]);
	useEffect((): void => {
		if (programRevision) synchronize();
	}, [programRevision, synchronize]);
	const open = useMutation(api.messaging.openDirect);
	const createGroup = useMutation(api.messaging.createGroup);
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
			value={useMemo(
				() => ({
					error,
					retry: synchronize,
					threads: threads ?? [],
					loading: threads === undefined,
					openDirect,
					createGroup,
					openSession: (eventId: string): Promise<string> =>
						openSession({ eventId }),
					markRead,
				}),
				[
					error,
					synchronize,
					threads,
					openDirect,
					createGroup,
					openSession,
					markRead,
				],
			)}
		>
			{children}
		</MessagingContext.Provider>
	);
};
