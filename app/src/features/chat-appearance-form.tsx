import { type ReactElement, useState } from "react";
import { Button, Dialog, Row, Stack, Text } from "../design-system";
import type { Conversation } from "../domain/app-types";
import type { ChatAppearance } from "../domain/chat-appearance";
import {
	defaultPhotoCrop,
	type PhotoCrop,
	type PhotoSource,
} from "../domain/photo-crop";
import { cropProfilePhoto } from "./crop-profile-photo";
import { ProfilePhotoCropper } from "./profile-photo-cropper";
import { useFormTask } from "./use-form-task";
import { useImageService } from "./use-image-service";

export const ChatAppearanceForm = ({
	thread,
	source,
	save,
	onClose,
}: {
	thread: Conversation;
	source: PhotoSource;
	save: (next: ChatAppearance, expected: ChatAppearance) => Promise<void>;
	onClose: () => void;
}): ReactElement => {
	const [snapshot] = useState(thread);
	const [crop, setCrop] = useState<PhotoCrop>(defaultPhotoCrop);
	const [uploaded, setUploaded] = useState<{ crop: PhotoCrop; id: string }>();
	const [uploads, setUploads] = useState<string[]>([]);
	const service = useImageService();
	const task = useFormTask();
	const discard = async (keep?: string): Promise<void> => {
		if (!service) return;
		await Promise.all(
			uploads
				.filter((id) => id !== keep && id !== snapshot.avatarImageId)
				.map((id) => service.remove(id)),
		);
	};
	const close = (): void => {
		void task.run(async (): Promise<void> => {
			await discard();
			onClose();
		});
	};
	const submit = (): void => {
		void task.submit(
			() => (!service ? "Photo storage is unavailable. Try again." : undefined),
			async (): Promise<void> => {
				if (!service) return;
				const reuse =
					uploaded &&
					uploaded.crop.x === crop.x &&
					uploaded.crop.y === crop.y &&
					uploaded.crop.zoom === crop.zoom;
				const imageId = reuse
					? uploaded.id
					: (
							await service.upload(
								thread.id,
								await cropProfilePhoto(source, crop),
								"Chat picture",
							)
						).id;
				if (!reuse) {
					setUploaded({ crop, id: imageId });
					setUploads((current) => [...current, imageId]);
				}
				await save({ avatarImageId: imageId }, snapshot);
				await discard(imageId);
				onClose();
			},
		);
	};
	return (
		<Dialog
			title="Chat picture"
			intent="picker"
			isOpen
			isDismissDisabled={task.busy}
			onOpenChange={(open): void => {
				if (!open && !task.busy) close();
			}}
			footer={
				<Row>
					<Button
						label="Cancel"
						variant="ghost"
						isDisabled={task.busy}
						onPress={close}
					/>
					<Button
						label="Save"
						accessibilityLabel="Save chat picture"
						isLoading={task.busy}
						onPress={submit}
					/>
				</Row>
			}
		>
			<Stack>
				<ProfilePhotoCropper
					source={source}
					crop={crop}
					onChange={setCrop}
					isDisabled={task.busy}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
