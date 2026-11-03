import type { ReactElement } from "react";
import {
	type ResourceState,
	useLiveResources,
	usePreviewResources,
} from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import { LoadingContent, Text } from "../design-system";
import { ResourcePlayback } from "./resource-playback";
import { SessionPlanLinkMedia } from "./session-plan-link-media";
import { SessionPlanResourceDocument } from "./session-plan-resource-document";

const ResourceMedia = ({ state }: { state: ResourceState }): ReactElement => {
	const resource = state.detail?.resource;
	if (state.detailError || (!resource && !state.loading))
		return (
			<Text variant="small" tone="secondary">
				This attachment is unavailable or you don’t have access.
			</Text>
		);
	if (!resource) return <LoadingContent />;
	if (resource.fileId)
		return resource.kind === "video" ? (
			<ResourcePlayback
				key={`${resource.id}:${resource.revision}`}
				state={state}
				resource={resource}
				slot="primary"
			/>
		) : (
			<SessionPlanResourceDocument
				key={`${resource.id}:${resource.revision}`}
				state={state}
				resource={resource}
			/>
		);
	return resource.url ? (
		<SessionPlanLinkMedia url={resource.url} label={resource.title} />
	) : (
		<Text variant="small" tone="secondary">
			Media unavailable.
		</Text>
	);
};
const LiveResourceMedia = ({
	resourceId,
}: {
	resourceId: string;
}): ReactElement => (
	<ResourceMedia
		state={useLiveResources(
			{ kind: "all", archived: false, search: "" },
			resourceId,
			{ optionalDetail: true },
		)}
	/>
);
const PreviewResourceMedia = ({
	resourceId,
}: {
	resourceId: string;
}): ReactElement => (
	<ResourceMedia
		state={usePreviewResources(
			{ kind: "all", archived: false, search: "" },
			resourceId,
		)}
	/>
);
export const SessionPlanResourceMedia = ({
	resourceId,
}: {
	resourceId: string;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveResourceMedia resourceId={resourceId} />
	) : (
		<PreviewResourceMedia resourceId={resourceId} />
	);
