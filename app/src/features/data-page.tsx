import {
	type PaginatedQueryArgs,
	type PaginatedQueryItem,
	type PaginatedQueryReference,
	usePaginatedQuery,
} from "convex/react";
import { getFunctionName } from "convex/server";
import { type ReactElement, type ReactNode, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, LoadingContent, Row, Text } from "../design-system";

type PageConfig<Query extends PaginatedQueryReference> = {
	query: Query;
	args: PaginatedQueryArgs<Query>;
	preview: PaginatedQueryItem<Query>[];
	size?: number;
};
type Props<Query extends PaginatedQueryReference> = {
	config: PageConfig<Query>;
	children: (items: PaginatedQueryItem<Query>[]) => ReactNode;
};
const PageButtons = ({
	page,
	next,
	previous,
}: {
	page: number;
	next?: () => void;
	previous?: () => void;
}): ReactElement => (
	<Row justify="between">
		<Button
			label="Previous"
			variant="ghost"
			isDisabled={!previous}
			onPress={previous ?? (() => {})}
		/>
		<Text variant="caption" tone="secondary">
			Page {page}
		</Text>
		<Button
			label="Next"
			variant="ghost"
			isDisabled={!next}
			onPress={next ?? (() => {})}
		/>
	</Row>
);
const LiveDataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const { results, status, loadMore } = usePaginatedQuery(
		config.query,
		config.args,
		{ initialNumItems: config.size ?? 30 },
	);
	return (
		<>
			{status === "LoadingFirstPage" ? <LoadingContent /> : children(results)}
			{status === "CanLoadMore" || status === "LoadingMore" ? (
				<Row justify="end">
					<Button
						label="Load more"
						variant="ghost"
						isLoading={status === "LoadingMore"}
						onPress={(): void => loadMore(config.size ?? 30)}
					/>
				</Row>
			) : undefined}
		</>
	);
};
const PreviewDataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const [page, setPage] = useState(0);
	const size = config.size ?? 30;
	return (
		<>
			{children(config.preview.slice(page * size, (page + 1) * size))}
			{config.preview.length > size ? (
				<PageButtons
					page={page + 1}
					previous={page ? () => setPage((current) => current - 1) : undefined}
					next={
						(page + 1) * size < config.preview.length
							? () => setPage((current) => current + 1)
							: undefined
					}
				/>
			) : undefined}
		</>
	);
};
export const DataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const { source, account } = useApp();
	const key = JSON.stringify([
		getFunctionName(config.query),
		config.args,
		config.size ?? 30,
		account.id,
	]);
	return source === "convex" ? (
		<LiveDataPage key={key} config={config}>
			{children}
		</LiveDataPage>
	) : (
		<PreviewDataPage key={key} config={config}>
			{children}
		</PreviewDataPage>
	);
};
