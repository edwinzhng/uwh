import type { ReactElement } from "react";
import { useResourceMedia } from "../backend/use-resource-media";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	DocumentPreview,
	LoadingContent,
	MediaPoster,
	Stack,
	Text,
} from "../design-system";
import {
	type Resource,
	resourceUrl,
	supportedResourceLink,
} from "../domain/resources";
import { useFormTask } from "./use-form-task";

export const ResourceDocument = ({
	state,
	resource,
}: {
	state: ResourceState;
	resource: Resource;
}): ReactElement => {
	const task = useFormTask();
	const secureUrl = resource.url ? resourceUrl(resource.url) : undefined;
	const path = secureUrl ? new URL(secureUrl).pathname : "";
	const image = resource.fileId
		? Boolean(resource.fileMime?.startsWith("image/"))
		: /\.(?:png|jpe?g|webp|gif)$/i.test(path);
	const previewable =
		image ||
		resource.fileMime === "application/pdf" ||
		Boolean(secureUrl && /\.pdf$/i.test(path));
	const media = useResourceMedia(
		state,
		resource,
		"primary",
		Boolean(resource.fileId && previewable),
	);
	const external =
		resource.url && supportedResourceLink("document", resource.url)
			? resource.url
			: undefined;
	const uri = resource.fileId ? media.uri : external;
	if (!resource.fileId && !external)
		return <Text tone="secondary">Document unavailable.</Text>;
	return (
		<Stack gap="xs">
			{uri && previewable ? (
				<DocumentPreview uri={uri} label={resource.title} image={image} />
			) : media.loading ? (
				<LoadingContent />
			) : resource.fileId && !previewable ? (
				<MediaPoster
					kind="document"
					label={resource.fileName ?? resource.title}
					busy={task.busy}
					onPress={(): void => {
						void task.run(() => state.open(resource));
					}}
				/>
			) : undefined}
			{media.error ? (
				<Stack gap="xs">
					<Text tone="danger">{media.error}</Text>
					<Button label="Retry document" compact onPress={media.retry} />
				</Stack>
			) : undefined}
			{resource.fileId && previewable ? (
				<Button
					label="Download document"
					variant="ghost"
					compact
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(() => state.open(resource));
					}}
				/>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
