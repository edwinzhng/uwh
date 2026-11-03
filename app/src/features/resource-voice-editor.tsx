import { type ReactElement, useState } from "react";
import {
	type PickedResourceFile,
	pickResourceFile,
} from "../backend/pick-resource-file";
import { readMediaFile } from "../backend/read-media-file";
import { usePickedResourceFile } from "../backend/use-picked-resource-file";
import type { ResourceState } from "../backend/use-resources";
import {
	Button,
	MediaAudio,
	Row,
	Stack,
	Text,
	useVoiceRecorder,
} from "../design-system";
import { type Resource, resourceLimits } from "../domain/resources";
import { ResourcePlayback } from "./resource-playback";
import type { useFormTask } from "./use-form-task";

export const ResourceVoiceEditor = ({
	state,
	previous,
	value,
	removed,
	task,
	onChange,
	onRecordingChange,
}: {
	state: ResourceState;
	previous?: Resource;
	value?: PickedResourceFile;
	removed: boolean;
	task: ReturnType<typeof useFormTask>;
	onChange: (value: PickedResourceFile | undefined) => void;
	onRecordingChange: (recording: boolean) => void;
}): ReactElement => {
	const recorder = useVoiceRecorder();
	const [started, setStarted] = useState(false);
	const uri = usePickedResourceFile(value);
	const toggle = async (): Promise<void> => {
		await task.run(async (): Promise<void> => {
			if (!started) {
				await recorder.start();
				setStarted(true);
				onRecordingChange(true);
			} else {
				const recording = await recorder.stop();
				const blob = await readMediaFile(recording.uri, recording.mime);
				await recorder.discard();
				setStarted(false);
				onRecordingChange(false);
				onChange({
					name: recording.name,
					blob,
				});
			}
		});
	};
	return (
		<Stack gap="xs">
			<Text variant="label">Coach voice note</Text>
			{uri ? (
				<MediaAudio uri={uri} label="selected voice note" />
			) : previous?.voiceFileId && !removed ? (
				<ResourcePlayback state={state} resource={previous} slot="voice" />
			) : undefined}
			<Row wrap>
				<Button
					label={
						started
							? recorder.recording
								? "Stop recording"
								: "Use recording"
							: "Record voice note"
					}
					prefix="microphone"
					variant="secondary"
					isLoading={task.busy}
					onPress={(): void => {
						void toggle();
					}}
				/>
				{started ? (
					<Button
						label="Discard recording"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								try {
									await recorder.discard();
								} finally {
									setStarted(false);
									onRecordingChange(false);
								}
							});
						}}
					/>
				) : undefined}
				<Button
					label="Attach audio file"
					variant="ghost"
					isDisabled={task.busy || started}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							const file = await pickResourceFile("voice");
							if (file) onChange(file);
						});
					}}
				/>
				{value || (previous?.voiceFileId && !removed) ? (
					<Button
						label="Remove voice note"
						variant="ghost"
						isDisabled={task.busy || started}
						onPress={(): void => onChange(undefined)}
					/>
				) : undefined}
			</Row>
			<Text variant="caption" tone="secondary">
				{started
					? `${recorder.seconds} / ${resourceLimits.voiceSeconds} seconds · recording stays on this device until saved`
					: "Record up to 2 minutes or attach audio under 10 MB. Shared with this video’s audience."}
			</Text>
		</Stack>
	);
};
