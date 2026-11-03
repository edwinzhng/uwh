import type { ReactElement } from "react";
import { useResourceMedia } from "../backend/use-resource-media";
import type { ResourceState } from "../backend/use-resources";
import { Button, MediaImage, Stack } from "../design-system";
import { type Resource, youtubeThumbnail } from "../domain/resources";

export const ResourceThumbnail = ({
	state,
	resource,
	compact = false,
}: {
	state: ResourceState;
	resource: Resource;
	compact?: boolean;
}): ReactElement | undefined => {
	const media = useResourceMedia(
		state,
		resource,
		"thumbnail",
		Boolean(resource.thumbnailFileId),
	);
	const uri = resource.thumbnailFileId
		? media.uri
		: youtubeThumbnail(resource.url);
	return uri ? (
		<MediaImage
			uri={uri}
			label={`${resource.title} thumbnail`}
			compact={compact}
		/>
	) : media.error ? (
		<Stack gap="xs">
			<Button
				label="Retry thumbnail"
				variant="ghost"
				compact
				onPress={media.retry}
			/>
		</Stack>
	) : undefined;
};
