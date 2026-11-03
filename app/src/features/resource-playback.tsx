import { type ReactElement, useState } from "react";
import { useResourceMedia } from "../backend/use-resource-media";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	LoadingContent,
	MediaAudio,
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
	return (
		<Stack gap="xs">
			{!requested ? (
				<Button
					label="Load private video"
					variant="secondary"
					onPress={(): void => setRequested(true)}
				/>
			) : media.uri ? (
				slot === "voice" ? (
					<MediaAudio uri={media.uri} label="coach voice note" />
				) : (
					<MediaVideo uri={media.uri} label={resource.title} />
				)
			) : media.error ? (
				<Stack gap="xs">
					<Text variant="small" tone="danger">
						{media.error}
					</Text>
					<Button
						label="Retry media"
						variant="secondary"
						onPress={media.retry}
					/>
				</Stack>
			) : (
				<LoadingContent />
			)}
		</Stack>
	);
};
