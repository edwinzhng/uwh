import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	type ResourceState,
	useLiveResources,
	usePreviewResources,
} from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	EmptyState,
	Field,
	Grid,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Row,
	Select,
	Stack,
	Surface,
	Tabs,
	Text,
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
import { ResourceThumbnail } from "./resource-thumbnail";
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
	const { account, data } = useApp();
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
	const person = filters.personId
		? data.members.find((member) => member.id === filters.personId)
		: undefined;
	const open = (resourceId?: string): void =>
		router.setParams({ id: resourceId });
	return (
		<ClubShell
			title={
				id
					? (state.detail?.resource.title ?? "Resource")
					: filters.kind === "video"
						? "Videos & feedback"
						: filters.kind === "document"
							? "Documents"
							: "Resources"
			}
			back={
				<Button
					label={id ? "Resources" : "Club"}
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
						label="Resources"
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
				) : (
					<LoadingContent />
				)
			) : (
				<Stack>
					<Grid gap="sm">
						<Stack>
							<Field
								label="Search resources"
								value={filters.search}
								onValueChange={(search): void =>
									onFiltersChange({ ...filters, search })
								}
								placeholder="Title, notes or player name"
								maxLength={120}
							/>
						</Stack>
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
					</Grid>
					{person ? (
						<Row justify="between">
							<Text variant="small">Tagged: {person.name}</Text>
							<Button
								label="Show all players"
								variant="ghost"
								compact
								onPress={(): void => {
									onFiltersChange({ ...filters, personId: undefined });
									router.setParams({ person: undefined });
								}}
							/>
						</Row>
					) : undefined}
					<Surface padding="xs">
						<List>
							{state.items.map((resource) => (
								<ListItem
									key={resource.id}
									title={resource.title}
									titleAccessory={
										<Badge
											label={resource.kind === "video" ? "Video" : "Document"}
										/>
									}
									description={[
										resource.kind === "document"
											? resourceCategories.find(
													(category) =>
														category.value === (resource.category ?? "other"),
												)?.label
											: resource.sessionNumber
												? `Session ${resource.sessionNumber}`
												: undefined,
										resource.description,
										resource.audience === "coaches"
											? "Coaches and admins"
											: resource.audience === "programs"
												? "Selected programs and staff"
												: resource.audience === "players"
													? "Tagged players, guardians and staff"
													: "Club",
									]
										.filter(Boolean)
										.join(" · ")}
									descriptionLines={2}
									icon={resource.kind === "video" ? "image" : "list"}
									trailing={
										resource.kind === "video" &&
										(resource.thumbnailFileId || resource.url) ? (
											<ResourceThumbnail
												state={state}
												resource={resource}
												compact
											/>
										) : undefined
									}
									onPress={(): void => open(resource.id)}
								/>
							))}
							{state.loading ? (
								<LoadingContent />
							) : !state.items.length ? (
								<EmptyState
									title={
										filters.search
											? state.loadMore
												? "No matches in this batch"
												: "No matching resources"
											: filters.archived
												? "No archived resources"
												: "No resources"
									}
									description={
										filters.search
											? state.loadMore
												? "Searching the library…"
												: "Try another title, note or player name."
											: canManage
												? "Add a document or video for your club."
												: undefined
									}
								/>
							) : undefined}
						</List>
					</Surface>
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
					initialPersonId={filters.personId}
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
		person?: string;
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
	const effectiveFilters: ResourceFilters = {
		...filters,
		kind:
			params.kind === "video" || params.kind === "document"
				? params.kind
				: filters.kind,
		personId: params.person,
	};
	const changeFilters = (next: ResourceFilters): void => {
		setFilters(next);
		const kind = next.kind === "all" ? undefined : next.kind;
		if (params.kind !== kind) router.setParams({ kind });
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
