import {
	type PaginatedQueryArgs,
	type PaginatedQueryItem,
	type PaginatedQueryReference,
	usePaginatedQuery,
} from "convex/react";
import { getFunctionName } from "convex/server";
import { type ReactElement, type ReactNode, useState } from "react";
import { useApp } from "../demo/app-state";
import { InfiniteScroll, LoadingBoundary } from "../design-system";
import { createQueryPageCache } from "./query-page-cache";

type PageConfig<Query extends PaginatedQueryReference> = {
	query: Query;
	args: PaginatedQueryArgs<Query>;
	preview: PaginatedQueryItem<Query>[];
	size?: number;
	showMore?: boolean;
};
type Props<Query extends PaginatedQueryReference> = {
	config: PageConfig<Query>;
	children: (
		items: PaginatedQueryItem<Query>[],
		state: { complete: boolean },
	) => ReactNode;
};
const LiveDataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const { results, status, loadMore } = usePaginatedQuery(
		config.query,
		config.args,
		{ initialNumItems: config.size ?? 30 },
	);
	const [cache] = useState(() =>
		createQueryPageCache<PaginatedQueryItem<Query>>(),
	);
	const key = JSON.stringify(config.args);
	const size = config.size ?? 30;
	if (status !== "LoadingFirstPage")
		cache.write(key, {
			items: results.slice(0, size),
			complete: status === "Exhausted" && results.length <= size,
		});
	const cached = status === "LoadingFirstPage" ? cache.read(key) : undefined;
	const items = cached?.items ?? results;
	return (
		<>
			<LoadingBoundary
				loading={status === "LoadingFirstPage" && !cached}
				gap="sm"
			>
				{(): ReactNode =>
					children(items, {
						complete: cached?.complete ?? status === "Exhausted",
					})
				}
			</LoadingBoundary>
			{config.showMore !== false &&
			(status === "CanLoadMore" || status === "LoadingMore") ? (
				<InfiniteScroll
					loadMore={
						status === "CanLoadMore"
							? (): void => loadMore(config.size ?? 30)
							: undefined
					}
					loading={status === "LoadingMore"}
					revision={results.length}
				/>
			) : undefined}
		</>
	);
};
const PreviewDataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const [count, setCount] = useState(config.size ?? 30);
	return (
		<>
			{children(config.preview.slice(0, count), {
				complete: count >= config.preview.length,
			})}
			{config.showMore !== false && config.preview.length > count ? (
				<InfiniteScroll
					loadMore={(): void =>
						setCount((current) => current + (config.size ?? 30))
					}
					revision={count}
				/>
			) : undefined}
		</>
	);
};
export const DataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const { source, account, workspaceId } = useApp();
	const key = JSON.stringify([
		getFunctionName(config.query),
		config.size ?? 30,
		workspaceId,
		account.id,
		account.admin,
		account.coachPrograms,
		account.children,
	]);
	return source === "convex" ? (
		<LiveDataPage key={key} config={config}>
			{children}
		</LiveDataPage>
	) : (
		<PreviewDataPage
			key={`${key}:${JSON.stringify(config.args)}`}
			config={config}
		>
			{children}
		</PreviewDataPage>
	);
};
