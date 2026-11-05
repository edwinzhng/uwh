import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	type ResourceState,
	useLiveResources,
	usePreviewResources,
} from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Button,
	Disclosure,
	EmptyState,
	Field,
	Grid,
	InfiniteScroll,
	List,
	LoadingContent,
	Row,
	Select,
	Stack,
	Tabs,
	useRouteSelection,
} from "../design-system";
import {
	type Resource,
	type ResourceFilters,
	type ResourceKind,
	resourceCategories,
} from "../domain/resources";
import { ClubShell } from "./club-shell";
import { ResourceDetails } from "./resource-details";
import { ResourceEditor } from "./resource-editor";
import { ResourceListRow } from "./resource-list-row";
import { useReviewFlow } from "./use-review-flow";
import { useSearchTerm } from "./use-search-term";

type PageProps = {
	filters: ResourceFilters;
	onFiltersChange: (filters: ResourceFilters) => void;
	id?: string;
};
const ResourceWorkspace = ({
	state,
	filters,
	onFiltersChange,
	id,
}: PageProps & { state: ResourceState }): ReactElement => {
	const router = useRouter();
	const { account } = useApp();
	const canManage = account.admin || account.coachPrograms.length > 0;
	const review = useReviewFlow();
	const params = useLocalSearchParams<{ new?: string }>();
	const [editor, setEditor] = useState<"new" | Resource | undefined>(
		canManage &&
			review &&
			["document", "video-upload", "resource-programs"].includes(review)
			? "new"
			: undefined,
	);
	const activeEditor =
		editor ?? (canManage && params.new === "video" ? "new" : undefined);
	const open = (resourceId?: string): void =>
		router.setParams({ id: resourceId });
	return (
		<ClubShell
			presentation={id ? "workspace" : "page"}
			title={
				id
					? (state.detail?.resource.title ?? "Resource")
					: filters.kind === "video"
						? "Videos"
						: filters.kind === "document"
							? "Files"
							: "Files"
			}
			back={
				<Button
					label={id ? "Files" : "Club"}
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => {
						if (id) open();
						else router.navigate("/club");
					}}
				/>
			}
			action={
				canManage && !id ? (
					<Button
						label="New"
						roleTone={account.coachPrograms.length ? "coach" : "admin"}
						prefix="plus"
						onPress={(): void => setEditor("new")}
					/>
				) : undefined
			}
			tabs={
				!id ? (
					<Tabs
						page
						hideLabel
						label="Files"
						value={filters.kind}
						onValueChange={(kind: "all" | ResourceKind): void =>
							onFiltersChange({ ...filters, kind, category: "all" })
						}
						options={[
							{ value: "all", label: "All" },
							{ value: "document", label: "Documents" },
							{ value: "video", label: "Videos" },
						]}
					/>
				) : undefined
			}
		>
			{id ? (
				state.detail ? (
					<ResourceDetails
						key={id}
						state={state}
						canManage={canManage}
						onEdit={setEditor}
					/>
				) : state.detailError ? (
					<EmptyState
						title="Resource unavailable"
						description={state.detailError}
					/>
				) : (
					<LoadingContent />
				)
			) : (
				<Stack>
					<Grid gap="sm">
						<Stack>
							<Field
								label="Search files"
								value={filters.search}
								onValueChange={(search): void =>
									onFiltersChange({ ...filters, search })
								}
								placeholder="Search files"
								maxLength={120}
							/>
						</Stack>
						<Disclosure
							title="Filter files"
							summary={
								[
									filters.archived ? "Archived" : undefined,
									filters.category && filters.category !== "all"
										? resourceCategories.find(
												(entry) => entry.value === filters.category,
											)?.label
										: undefined,
								]
									.filter(Boolean)
									.join(" · ") || undefined
							}
							defaultOpen={Boolean(
								filters.archived ||
									(filters.category && filters.category !== "all"),
							)}
						>
							<Select
								label="Show"
								value={filters.archived ? "archived" : "active"}
								options={[
									{ value: "active", label: "Active" },
									{ value: "archived", label: "Archived" },
								]}
								onValueChange={(value): void => {
									if (value)
										onFiltersChange({
											...filters,
											archived: value === "archived",
										});
								}}
							/>
							{filters.kind !== "video" ? (
								<Select
									label="Document category"
									value={filters.category ?? "all"}
									options={[
										{ value: "all", label: "All categories" },
										...resourceCategories,
									]}
									onValueChange={(category): void => {
										if (category) onFiltersChange({ ...filters, category });
									}}
								/>
							) : undefined}
						</Disclosure>
					</Grid>
					<List gap="xs">
						{state.items.map((resource) => (
							<ResourceListRow
								key={resource.id}
								resource={resource}
								state={state}
								onOpen={(): void => open(resource.id)}
							/>
						))}
						{state.loading ? (
							<LoadingContent />
						) : !state.items.length ? (
							<EmptyState
								title={
									filters.search
										? state.loadMore
											? "Searching files…"
											: "No matching files"
										: filters.archived
											? "No archived files"
											: "No files"
								}
							/>
						) : undefined}
					</List>
					{state.loadMore || state.loadingMore ? (
						<Row justify="center">
							<InfiniteScroll
								loadMore={state.loadMore}
								loading={state.loadingMore}
								revision={state.items.length}
								disabled={false}
							/>
						</Row>
					) : undefined}
				</Stack>
			)}
			{activeEditor ? (
				<ResourceEditor
					previous={activeEditor === "new" ? undefined : activeEditor}
					initialKind={filters.kind === "all" ? undefined : filters.kind}
					state={state}
					onClose={(): void => {
						setEditor(undefined);
						router.setParams({ new: undefined });
					}}
					onSaved={(resourceId): void => {
						setEditor(undefined);
						router.setParams({ new: undefined });
						open(resourceId);
					}}
				/>
			) : undefined}
		</ClubShell>
	);
};
const LiveResources = (props: PageProps): ReactElement => {
	const search = useSearchTerm(props.filters.search);
	const state = useLiveResources({ ...props.filters, search }, props.id);
	return (
		<ResourceWorkspace
			state={state}
			filters={props.filters}
			id={props.id}
			onFiltersChange={props.onFiltersChange}
		/>
	);
};
const PreviewResources = (props: PageProps): ReactElement => {
	const state = usePreviewResources(props.filters, props.id);
	return (
		<ResourceWorkspace
			state={state}
			filters={props.filters}
			id={props.id}
			onFiltersChange={props.onFiltersChange}
		/>
	);
};
export const ResourcesScreen = (): ReactElement => {
	const router = useRouter();
	const params = useLocalSearchParams<{
		id?: string;
		kind?: string;
	}>();
	const { source } = useApp();
	const [filters, setFilters] = useState<ResourceFilters>({
		kind:
			params.kind === "video" || params.kind === "document"
				? params.kind
				: "all",
		search: "",
		archived: false,
	});
	const kindSelection = useRouteSelection<ResourceFilters["kind"]>(
		params.kind === "video" || params.kind === "document" ? params.kind : "all",
		(kind): void =>
			router.setParams({ kind: kind === "all" ? undefined : kind }),
	);
	const effectiveFilters: ResourceFilters = {
		...filters,
		kind: kindSelection.value,
	};
	const changeFilters = (next: ResourceFilters): void => {
		setFilters(next);
		kindSelection.select(next.kind);
	};

	return source === "convex" ? (
		<LiveResources
			filters={effectiveFilters}
			id={params.id}
			onFiltersChange={changeFilters}
		/>
	) : (
		<PreviewResources
			filters={effectiveFilters}
			id={params.id}
			onFiltersChange={changeFilters}
		/>
	);
};
