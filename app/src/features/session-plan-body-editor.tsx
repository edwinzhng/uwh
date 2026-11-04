import { type ReactElement, useState } from "react";
import { prepareImage } from "../backend/image-service";
import type { PlanImages } from "../backend/plan-images";
import { newId } from "../demo/app-state";
import { Button, RichTextField, Stack, Text } from "../design-system";
import {
	maxSessionPlanBodyLength,
	maxSessionPlanMedia,
	planBodyBlocks,
	planImageMarker,
	type SessionPlanDraft,
} from "../domain/session-plan";
import { requireNativeFeature } from "../platform/native-feature";
import { SessionPlanImage } from "./session-plan-image";
import { useFormTask } from "./use-form-task";

export const SessionPlanBodyEditor = ({
	draft,
	onChange,
	images,
	disabled,
	onBusyChange,
}: {
	draft: SessionPlanDraft;
	onChange: (draft: SessionPlanDraft) => void;
	images: PlanImages;
	disabled: boolean;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const task = useFormTask();
	const [active, setActive] = useState(0);
	const blocks = planBodyBlocks(draft);
	const addImage = (): void => {
		void task.submit(
			() =>
				draft.media.length >= maxSessionPlanMedia
					? "Add up to 20 images."
					: undefined,
			async (): Promise<void> => {
				onBusyChange(true);
				try {
					requireNativeFeature("ExponentImagePicker", "plan images");
					const picker = await import("expo-image-picker");
					const result = await picker.launchImageLibraryAsync({
						mediaTypes: ["images"],
						quality: 0.85,
						exif: false,
					});
					const asset = !result.canceled ? result.assets.at(0) : undefined;
					if (!asset) return;
					const blob = await prepareImage(
						asset.file ?? (await (await fetch(asset.uri)).blob()),
					);
					const file = await images.upload(
						blob,
						asset.fileName ?? "Plan image",
					);
					const id = newId();
					const parts = blocks.map((block, index) =>
						block.image
							? planImageMarker(block.image.id)
							: block.text + (index === active ? planImageMarker(id) : ""),
					);
					onChange({
						...draft,
						body: parts.join(""),
						media: [
							...draft.media,
							{ id, label: file.name, source: "image", fileId: file.id },
						],
					});
				} finally {
					onBusyChange(false);
				}
			},
		);
	};
	return (
		<Stack gap="xs">
			{blocks.map((block, index) =>
				block.image ? (
					<Stack key={block.image.id} gap="xs">
						<SessionPlanImage image={block.image} />
						<Button
							label={`Remove ${block.image.label}`}
							icon="close"
							compact
							variant="ghost"
							isDisabled={disabled || task.busy}
							onPress={(): void => {
								setActive(0);
								onChange({
									...draft,
									body: draft.body.replace(
										planImageMarker(block.image?.id ?? ""),
										"",
									),
									media: draft.media.filter(
										(image) => image.id !== block.image?.id,
									),
								});
							}}
						/>
					</Stack>
				) : (
					<RichTextField
						key={block.id}
						label={index === 0 ? "Plan" : "Continue plan"}
						value={block.text}
						rows={blocks.length > 1 ? 2 : 5}
						maxLength={maxSessionPlanBodyLength}
						isDisabled={disabled || task.busy}
						onFocus={(): void => setActive(index)}
						onValueChange={(text): void =>
							onChange({
								...draft,
								body: blocks
									.map((part, partIndex) =>
										part.image
											? planImageMarker(part.image.id)
											: partIndex === index
												? text
												: part.text,
									)
									.join(""),
							})
						}
						toolbarAction={
							index === active ? (
								<Button
									label="Insert image"
									icon="image"
									compact
									variant="ghost"
									isDisabled={disabled || task.busy}
									isLoading={task.busy}
									onPress={addImage}
								/>
							) : undefined
						}
					/>
				),
			)}
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
		</Stack>
	);
};
