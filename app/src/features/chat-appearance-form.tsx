import { type ReactElement, useEffect, useState } from "react";
import {
	Button,
	Dialog,
	EditableAvatar,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { Conversation } from "../domain/app-types";
import {
	type ChatAppearance,
	sameChatAppearance,
} from "../domain/chat-appearance";
import {
	defaultPhotoCrop,
	type PhotoCrop,
	type PhotoSource,
} from "../domain/photo-crop";
import { cropProfilePhoto } from "./crop-profile-photo";
import { releasePhotoUri } from "./photo-uri";
import { pickPhotoSource } from "./pick-photo-source";
import { ProfilePhotoCropper } from "./profile-photo-cropper";
import { useFormTask } from "./use-form-task";
import { useImageService } from "./use-image-service";
import { usePhotoUri } from "./use-photo-uri";

export const ChatAppearanceForm = ({
	thread,
	save,
	onClose,
}: {
	thread: Conversation;
	save: (next: ChatAppearance, expected: ChatAppearance) => Promise<void>;
	onClose: () => void;
}): ReactElement => {
	const [snapshot] = useState(thread);
	const [input, setInput] = useState<ChatAppearance>({
		avatarIcon: thread.avatarIcon,
		avatarImageId: thread.avatarImageId,
	});
	const [source, setSource] = useState<PhotoSource>();
	const [crop, setCrop] = useState<PhotoCrop>(defaultPhotoCrop);
	const [uploads, setUploads] = useState<string[]>([]);
	const service = useImageService();
	const photo = usePhotoUri(input.avatarImageId, service);
	const task = useFormTask();
	useEffect(
		() => (source ? (): void => releasePhotoUri(source.uri) : undefined),
		[source],
	);
	const discard = async (keep?: string): Promise<void> => {
		if (!service) return;
		await Promise.all(
			uploads
				.filter((id) => id !== keep && id !== thread.avatarImageId)
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
			() =>
				source && !service
					? "Photo storage is unavailable. Try again."
					: undefined,
			async (): Promise<void> => {
				if (source && service) {
					const image = await service.upload(
						thread.id,
						await cropProfilePhoto(source, crop),
						"Chat picture",
					);
					setUploads((current) => [...current, image.id]);
					setInput({ avatarImageId: image.id });
					setSource(undefined);
				} else {
					await save(input, snapshot);
					await discard(input.avatarImageId);
					onClose();
				}
			},
		);
	};
	return (
		<Dialog
			title={source ? "Adjust chat picture" : "Chat picture"}
			intent="picker"
			isOpen
			isDismissDisabled={task.busy}
			onOpenChange={(open): void => {
				if (!open && !task.busy) close();
			}}
			footer={
				<Row wrap>
					<Button
						label={source ? "Cancel crop" : "Cancel"}
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							if (source) {
								task.clear();
								setSource(undefined);
							} else close();
						}}
					/>
					<Button
						label={source ? "Use photo" : "Save"}
						accessibilityLabel={source ? "Use photo" : "Save chat picture"}
						isLoading={task.busy}
						isDisabled={!source && sameChatAppearance(input, snapshot)}
						onPress={submit}
					/>
				</Row>
			}
		>
			<Stack>
				{source ? (
					<ProfilePhotoCropper
						source={source}
						crop={crop}
						onChange={setCrop}
						isDisabled={task.busy}
					/>
				) : (
					<>
						<Row justify="center" gap="md">
							<EditableAvatar
								name={thread.title}
								initials
								uri={photo.uri}
								label={
									input.avatarImageId
										? "Change chat photo"
										: "Choose chat photo"
								}
								isDisabled={task.busy}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										const next = await pickPhotoSource();
										if (next) {
											setCrop(defaultPhotoCrop);
											setSource(next);
										}
									});
								}}
							/>
							<Stack grow gap="xxs">
								<Text variant="h4" lines={2}>
									{thread.title}
								</Text>
								<Text variant="caption" tone="secondary">
									Tap picture to choose a photo
								</Text>
							</Stack>
						</Row>
						{photo.failed ? (
							<Button
								label="Retry photo"
								variant="ghost"
								onPress={photo.retry}
							/>
						) : undefined}
					</>
				)}
				{task.error ? (
					<Text tone="danger" variant="small">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
