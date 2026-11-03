import { type ReactElement, useState } from "react";
import {
	type ResourceState,
	useLiveResources,
	usePreviewResources,
} from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	Field,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Stack,
} from "../design-system";
import type { Resource, ResourceFilters } from "../domain/resources";

type Props = {
	search: string;
	onSearchChange: (search: string) => void;
	onSelect: (resource: Resource) => void;
	onCancel: () => void;
};
const Options = ({
	state,
	search,
	onSearchChange,
	onSelect,
	onCancel,
}: Props & { state: ResourceState }): ReactElement => (
	<Stack gap="sm">
		<Field
			label="Find a club resource"
			value={search}
			onValueChange={onSearchChange}
			placeholder="Document or video title"
		/>
		{state.loading ? (
			<LoadingContent />
		) : (
			<List>
				{state.items.map((resource) => (
					<ListItem
						key={resource.id}
						title={resource.title}
						description={resource.kind === "video" ? "Video" : "Document"}
						onPress={(): void => onSelect(resource)}
					/>
				))}
			</List>
		)}
		{!state.loading && !state.items.length ? (
			<EmptyState
				title="No matching resources"
				description="Add a resource in Club → Resources, or attach a secure media link."
			/>
		) : undefined}
		{state.loadMore ? (
			<InfiniteScroll
				loadMore={state.loadMore}
				loading={state.loadingMore}
				revision={state.items.length}
				disabled={false}
			/>
		) : undefined}
		<Button
			label="Cancel resource selection"
			variant="ghost"
			onPress={onCancel}
		/>
	</Stack>
);
const LiveOptions = (props: Props): ReactElement => {
	const filters: ResourceFilters = {
		kind: "all",
		archived: false,
		search: props.search,
	};
	return (
		<Options
			search={props.search}
			onSearchChange={props.onSearchChange}
			onSelect={props.onSelect}
			onCancel={props.onCancel}
			state={useLiveResources(filters)}
		/>
	);
};
const PreviewOptions = (props: Props): ReactElement => (
	<Options
		search={props.search}
		onSearchChange={props.onSearchChange}
		onSelect={props.onSelect}
		onCancel={props.onCancel}
		state={usePreviewResources({
			kind: "all",
			archived: false,
			search: props.search,
		})}
	/>
);
export const SessionPlanResourcePicker = ({
	onSelect,
	onCancel,
}: {
	onSelect: Props["onSelect"];
	onCancel: () => void;
}): ReactElement => {
	const [search, setSearch] = useState("");
	return useApp().source === "convex" ? (
		<LiveOptions
			search={search}
			onSearchChange={setSearch}
			onSelect={onSelect}
			onCancel={onCancel}
		/>
	) : (
		<PreviewOptions
			search={search}
			onSearchChange={setSearch}
			onSelect={onSelect}
			onCancel={onCancel}
		/>
	);
};
