import {
	type PaginatedQueryArgs,
	type PaginatedQueryItem,
	type PaginatedQueryReference,
	useQueries,
} from "convex/react";
import {
	type FunctionReference,
	getFunctionName,
	type PaginationOptions,
	type PaginationResult,
} from "convex/server";
import { type ReactElement, type ReactNode, useState } from "react";
import { shouldRestartPagination } from "../backend/pagination-recovery";
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
	loading,
}: {
	page: number;
	next?: () => void;
	previous?: () => void;
	loading?: boolean;
}): ReactElement => (
	<Row justify="between">
		<Button
			label="Previous"
			variant="ghost"
			isDisabled={!previous || loading}
			onPress={previous ?? (() => {})}
		/>
		<Text variant="caption" tone="secondary">
			Page {page}
		</Text>
		<Button
			label="Next"
			variant="ghost"
			isDisabled={!next || loading}
			onPress={next ?? (() => {})}
		/>
	</Row>
);
const LiveDataPage = <Query extends PaginatedQueryReference>({
	config,
	children,
}: Props<Query>): ReactElement => {
	const [cursors, setCursors] = useState<Array<string | null>>([null]);
	const reference: FunctionReference<
		"query",
		"public",
		{ paginationOpts: PaginationOptions },
		PaginationResult<PaginatedQueryItem<Query>>
	> = config.query;
	const cursor = cursors.at(-1) ?? null;
	const response:
		| PaginationResult<PaginatedQueryItem<Query>>
		| Error
		| undefined = useQueries({
		page: {
			query: reference,
			args: {
				...config.args,
				paginationOpts: {
					numItems: config.size ?? 30,
					cursor,
				},
			},
		},
	}).page;
	if (shouldRestartPagination(response, cursor)) {
		setCursors([null]);
		return <LoadingContent />;
	}
	if (response instanceof Error) throw response;
	const result = response;
	return (
		<>
			{result ? children(result.page) : <LoadingContent />}
			{cursors.length > 1 || (result && !result.isDone) ? (
				<PageButtons
					page={cursors.length}
					loading={!result}
					previous={
						cursors.length > 1
							? () => setCursors((current) => current.slice(0, -1))
							: undefined
					}
					next={
						result && !result.isDone
							? () =>
									setCursors((current) => [...current, result.continueCursor])
							: undefined
					}
				/>
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
