import type { ReactElement } from "react";
import { useResourceMedia } from "../backend/use-resource-media";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	DocumentPreview,
	LoadingContent,
	Stack,
	Text,
} from "../design-system";
import type { Resource } from "../domain/resources";
import { inlinePdfAvailable } from "../platform/inline-document";

export const SessionPlanResourceDocument = ({
	state,
	resource,
}: {
	state: ResourceState;
	resource: Resource;
}): ReactElement => {
	const image = Boolean(resource.fileMime?.startsWith("image/"));
	const supported =
		image || (resource.fileMime === "application/pdf" && inlinePdfAvailable);
	const media = useResourceMedia(state, resource, "primary", supported);
	if (!supported)
		return (
			<Text variant="small" tone="secondary">
				This file does not support an inline preview on this device.
			</Text>
		);
	if (media.uri)
		return (
			<DocumentPreview uri={media.uri} label={resource.title} image={image} />
		);
	return media.error ? (
		<Stack gap="xs">
			<Text variant="small" tone="secondary">
				Could not load this attachment.
			</Text>
			<Button
				label="Retry attachment"
				compact
				variant="secondary"
				onPress={media.retry}
			/>
		</Stack>
	) : (
		<LoadingContent />
	);
};
