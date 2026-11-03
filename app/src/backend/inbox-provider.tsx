import { usePaginatedQuery } from "convex/react";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useEffect,
	useEffectEvent,
	useRef,
} from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";

const useUnreadInbox = (): ReturnType<
	typeof usePaginatedQuery<typeof api.inbox.list>
> => {
	const unread = usePaginatedQuery(
		api.inbox.list,
		{ unreadOnly: true },
		{ initialNumItems: 25 },
	);
	const scans = useRef(0);
	const scan = useEffectEvent((): void => {
		if (scans.current >= 3) return;
		scans.current += 1;
		unread.loadMore(25);
	});
	useEffect((): void => {
		if (unread.results.length < 100 && unread.status === "CanLoadMore") scan();
	}, [unread.results.length, unread.status]);
	return unread;
};
const UnreadInboxContext = createContext<
	ReturnType<typeof useUnreadInbox> | undefined
>(undefined);
export const useSharedUnreadInbox = (): ReturnType<typeof useUnreadInbox> => {
	const unread = useContext(UnreadInboxContext);
	if (!unread) throw new Error("InboxProvider is required.");
	return unread;
};
const LiveInboxProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<UnreadInboxContext value={useUnreadInbox()}>{children}</UnreadInboxContext>
);
export const InboxProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactNode =>
	useApp().source === "convex" ? (
		<LiveInboxProvider>{children}</LiveInboxProvider>
	) : (
		children
	);
