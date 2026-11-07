import { type ReactElement, useState } from "react";
import { useResourceMedia } from "../backend/use-resource-media";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	LoadingContent,
	MediaAudio,
	MediaPoster,
	MediaVideo,
	Stack,
	Text,
} from "../design-system";
import type { Resource, ResourceFileSlot } from "../domain/resources";

export const ResourcePlayback = ({
	state,
	resource,
	slot,
}: {
	state: ResourceState;
	resource: Resource;
	slot: ResourceFileSlot;
}): ReactElement => {
	const [requested, setRequested] = useState(slot === "voice");
	const media = useResourceMedia(state, resource, slot, requested);
	const thumbnail = useResourceMedia(
		state,
		resource,
		"thumbnail",
		slot === "primary" && Boolean(resource.thumbnailFileId),
	);
	return (
		<Stack gap="xs">
			{media.uri ? (
				slot === "voice" ? (
					<MediaAudio uri={media.uri} label="Coach voice note" />
				) : (
					<MediaVideo
						uri={media.uri}
						label={resource.title}
						autoPlay
						onRetry={media.retry}
					/>
				)
			) : slot === "primary" ? (
				<MediaPoster
					uri={thumbnail.uri}
					label={`Play ${resource.title}`}
					busy={requested && media.loading}
					onPress={(): void => setRequested(true)}
				/>
			) : media.error ? undefined : (
				<LoadingContent />
			)}
			{media.error ? (
				<Stack gap="xs">
					<Text variant="small" tone="danger">
						{media.error}
					</Text>
					<Button
						label="Retry media"
						compact
						variant="secondary"
						onPress={media.retry}
					/>
				</Stack>
			) : undefined}
		</Stack>
	);
};
