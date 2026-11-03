import { useMutation, usePaginatedQuery } from "convex/react";
import { useAtomValue, useStore } from "jotai";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { previewAccountAtom, previewDataAtom } from "../demo/app-state";
import { previewInboxItems, previewInboxReads } from "../demo/inbox-state";
import { previewResources } from "../demo/resource-state";
import { previewSessionPlansAtom } from "../demo/session-plan-state";
import type { InboxItem, InboxTarget } from "../domain/inbox";
import { useSharedUnreadInbox } from "./inbox-provider";

export type InboxState = {
	items: InboxItem[];
	unreadCount: number;
	unreadLimited: boolean;
	loading: boolean;
	loadingMore: boolean;
	loadMore?: () => void;
	open: (id: string) => Promise<InboxTarget>;
	setRead: (id: string, read: boolean) => Promise<void>;
	markAll: () => Promise<void>;
};
export const useLiveInbox = (
	active: boolean,
	unreadOnly: boolean,
): InboxState => {
	const unread = useSharedUnreadInbox();
	const all = usePaginatedQuery(
		api.inbox.list,
		active && !unreadOnly ? { unreadOnly: false } : "skip",
		{ initialNumItems: 25 },
	);
	const open = useMutation(api.inbox.open);
	const setRead = useMutation(api.inbox.setRead);
	const markAll = useMutation(api.inbox.markAll);
	const page = unreadOnly ? unread : all;
	return {
		items: page.results,
		unreadCount: unread.results.length,
		unreadLimited: unread.status !== "Exhausted",
		loading: page.status === "LoadingFirstPage",
		loadingMore: page.status === "LoadingMore",
		loadMore:
			page.status === "CanLoadMore" ? (): void => page.loadMore(25) : undefined,
		open: (id): Promise<InboxTarget> => open({ id: id as Id<"inboxItems"> }),
		setRead: async (id, read): Promise<void> => {
			await setRead({ id: id as Id<"inboxItems">, read });
		},
		markAll: async (): Promise<void> => {
			const through = Date.now();
			const next = async (): Promise<void> => {
				if (!(await markAll({ through })).done) await next();
			};
			await next();
		},
	};
};
export const usePreviewInbox = (unreadOnly: boolean): InboxState => {
	const store = useStore();
	const data = useAtomValue(previewDataAtom);
	const account = useAtomValue(previewAccountAtom);
	const reads = useAtomValue(previewInboxReads);
	const resources = useAtomValue(previewResources);
	const plans = useAtomValue(previewSessionPlansAtom);
	const [limit, setLimit] = useState(25);
	const visible = (): InboxItem[] =>
		previewInboxItems(
			store.get(previewDataAtom),
			store.get(previewAccountAtom),
			store.get(previewInboxReads),
			store.get(previewResources),
			store.get(previewSessionPlansAtom),
		);
	const items = previewInboxItems(data, account, reads, resources, plans);
	const filtered = unreadOnly ? items.filter((item) => !item.readAt) : items;
	const requireItem = (id: string): InboxItem => {
		const item = visible().find((entry) => entry.id === id);
		if (!item)
			throw new Error("This notification is no longer available to you.");
		return item;
	};
	const setRead = async (id: string, read: boolean): Promise<void> => {
		requireItem(id);
		const actor = store.get(previewAccountAtom);
		store.set(previewInboxReads, {
			...store.get(previewInboxReads),
			[`${actor.id}:${id}`]: read ? Date.now() : undefined,
		});
	};
	return {
		items: filtered.slice(0, limit),
		unreadCount: items.filter((item) => !item.readAt).length,
		unreadLimited: false,
		loading: false,
		loadingMore: false,
		loadMore:
			filtered.length > limit
				? (): void => setLimit((previous) => previous + 25)
				: undefined,
		open: async (id): Promise<InboxTarget> => {
			const item = requireItem(id);
			await setRead(id, true);
			return item.target;
		},
		setRead,
		markAll: async (): Promise<void> => {
			const actor = store.get(previewAccountAtom);
			store.set(previewInboxReads, {
				...store.get(previewInboxReads),
				...Object.fromEntries(
					visible().map((item) => [`${actor.id}:${item.id}`, Date.now()]),
				),
			});
		},
	};
};
