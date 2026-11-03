import { type ReactElement, useState } from "react";
import { readImageBytes } from "../backend/image-bytes";
import {
	type PickedResourceFile,
	pickResourceFile,
} from "../backend/pick-resource-file";
import { usePickedResourceFile } from "../backend/use-picked-resource-file";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	captureVideoThumbnail,
	createMediaAsset,
	Field,
	MediaImage,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { Resource } from "../domain/resources";
import { ResourceThumbnail } from "./resource-thumbnail";
import type { useFormTask } from "./use-form-task";

export const ResourceThumbnailEditor = ({
	state,
	previous,
	main,
	value,
	removed,
	disabled,
	task,
	onChange,
}: {
	state: ResourceState;
	previous?: Resource;
	main?: PickedResourceFile;
	value?: PickedResourceFile;
	removed: boolean;
	disabled: boolean;
	task: ReturnType<typeof useFormTask>;
	onChange: (value: PickedResourceFile | undefined) => void;
}): ReactElement => {
	const [seconds, setSeconds] = useState("0");
	const uri = usePickedResourceFile(value);
	const capture = async (): Promise<void> => {
		await task.run(async (): Promise<void> => {
			const time = Number(seconds);
			if (!seconds.trim() || !Number.isFinite(time) || time < 0 || time > 86400)
				throw new Error("Enter a frame time in seconds.");
			const file =
				main ??
				(previous?.fileId ? await state.read(previous, "primary") : undefined);
			if (!file)
				throw new Error("Choose or upload a video before capturing a frame.");
			const asset = await createMediaAsset(
				await readImageBytes(file.blob),
				file.name,
				file.blob.type,
			);
			try {
				onChange({
					name: "video-thumbnail.jpg",
					blob: await captureVideoThumbnail(asset.uri, time),
				});
			} finally {
				asset.dispose();
			}
		});
	};
	return (
		<Stack gap="xs">
			<Text variant="label">Video thumbnail</Text>
			{uri ? (
				<MediaImage uri={uri} label="Selected video thumbnail" />
			) : previous && !removed ? (
				<ResourceThumbnail state={state} resource={previous} />
			) : undefined}
			<Row wrap>
				<Button
					label="Choose thumbnail image"
					variant="secondary"
					isDisabled={disabled}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							const file = await pickResourceFile("thumbnail");
							if (file) onChange(file);
						});
					}}
				/>
				{value || (previous?.thumbnailFileId && !removed) ? (
					<Button
						label="Remove thumbnail"
						variant="ghost"
						isDisabled={disabled}
						onPress={(): void => onChange(undefined)}
					/>
				) : undefined}
			</Row>
			{main || previous?.fileId ? (
				<Stack gap="xs">
					<Field
						label="Frame time in seconds"
						value={seconds}
						onValueChange={setSeconds}
						inputMode="decimal"
						isDisabled={disabled}
					/>
					<Row>
						<Button
							label="Capture video frame"
							variant="ghost"
							isDisabled={disabled}
							onPress={(): void => {
								void capture();
							}}
						/>
					</Row>
				</Stack>
			) : (
				<Text variant="caption" tone="secondary">
					YouTube links use their video thumbnail. Choose an image for other
					links.
				</Text>
			)}
		</Stack>
	);
};
