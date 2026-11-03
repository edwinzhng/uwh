import { type ReactElement, useEffect, useState } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { reviewProfilePhotoSource } from "../demo/profile-photo";
import { Avatar, Button, Dialog, Row, Stack, Text } from "../design-system";
import {
	type MemberProfile,
	type MemberProfileInput,
	memberProfileError,
	profileInput,
} from "../domain/member-profile";
import {
	defaultPhotoCrop,
	type PhotoCrop,
	type PhotoSource,
} from "../domain/photo-crop";
import { cropProfilePhoto } from "./crop-profile-photo";
import { MemberProfileFields } from "./member-profile-fields";
import { releasePhotoUri } from "./photo-uri";
import { pickPhotoSource } from "./pick-photo-source";
import { ProfilePhotoCropper } from "./profile-photo-cropper";
import { profilePhotoSource } from "./profile-photo-source";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { usePhotoUri } from "./use-photo-uri";
import { useReviewFlow } from "./use-review-flow";

export const MemberProfileForm = ({
	profile,
	state,
	onClose,
	photoOnly = false,
}: {
	profile: MemberProfile;
	state: MemberProfileState;
	onClose: () => void;
	photoOnly?: boolean;
}): ReactElement => {
	const [input, setInput] = useState<MemberProfileInput>(() =>
		profileInput(profile),
	);
	const reviewFlow = useReviewFlow();
	const [source, setSource] = useState<PhotoSource | undefined>(() =>
		reviewFlow === "profile-photo-crop"
			? reviewProfilePhotoSource()
			: undefined,
	);
	const [crop, setCrop] = useState<PhotoCrop>(defaultPhotoCrop);
	const photo = usePhotoUri(input.photoId, state.photos);
	const task = useFormTask();
	const saveKey = useOperationKey();
	const photoKey = useOperationKey();
	useEffect(
		() => (source ? (): void => releasePhotoUri(source.uri) : undefined),
		[source],
	);
	const setPhotoSource = (next: PhotoSource): void => {
		setCrop(defaultPhotoCrop);
		setSource(next);
	};
	const pick = async (): Promise<void> => {
		const next = await pickPhotoSource();
		if (next) setPhotoSource(next);
	};
	const replacePhoto = async (id: string | undefined): Promise<void> => {
		if (
			input.photoId &&
			input.photoId !== profile.photoId &&
			input.photoId !== id
		)
			await state.photos.remove(input.photoId);
		setInput((current) => ({ ...current, photoId: id }));
	};
	const close = (): void => {
		if (task.busy) return;
		void task.run(async (): Promise<void> => {
			if (
				input.photoId &&
				input.photoId !== profile.photoId &&
				state.profile?.photoId !== input.photoId
			)
				await state.photos.remove(input.photoId);
			onClose();
		});
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={
				source
					? "Adjust photo"
					: photoOnly
						? "Profile picture"
						: `Edit ${profile.name}`
			}
			isOpen
			onOpenChange={(open): void => {
				if (!open) close();
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
						label={
							source ? "Use photo" : photoOnly ? "Save picture" : "Save profile"
						}
						isLoading={task.busy}
						isDisabled={
							photoOnly && !source && input.photoId === profile.photoId
						}
						onPress={(): void => {
							if (source)
								void task.run(async (): Promise<void> => {
									const key = photoKey(
										JSON.stringify({ uri: source.uri, crop }),
									);
									const blob = await cropProfilePhoto(source, crop);
									const id = await state.photos.upload(
										profile.personId,
										blob,
										key,
									);
									await replacePhoto(id);
									setSource(undefined);
								});
							else
								void task.submit(
									() => memberProfileError(input),
									async (): Promise<void> => {
										await state.save({
											...input,
											personId: profile.personId,
											revision: profile.revision,
											expectedName: profile.name,
											key: saveKey(JSON.stringify(input)),
										});
										onClose();
									},
								);
						}}
					/>
				</Row>
			}
		>
			<Stack>
				{source ? (
					<Stack gap="xs">
						{reviewFlow === "profile-photo-crop" &&
						source.uri === reviewProfilePhotoSource().uri ? (
							<Text variant="caption" tone="secondary">
								Sample image · club logo
							</Text>
						) : undefined}
						<ProfilePhotoCropper
							source={source}
							crop={crop}
							onChange={setCrop}
							isDisabled={task.busy}
						/>
					</Stack>
				) : (
					<>
						<Row align="center" gap="sm" wrap>
							<Avatar
								name={input.name || profile.name}
								icon="user"
								uri={photo.uri}
								large
							/>
							<Button
								label={input.photoId ? "Change photo" : "Add photo"}
								variant="secondary"
								isDisabled={task.busy}
								onPress={(): void => {
									void task.run(pick);
								}}
							/>
							{input.photoId ? (
								<>
									<Button
										label="Adjust photo"
										variant="ghost"
										isDisabled={task.busy}
										onPress={(): void => {
											void task.run(
												async (): Promise<void> =>
													setPhotoSource(
														await profilePhotoSource(
															await state.photos.load(input.photoId ?? ""),
														),
													),
											);
										}}
									/>
									<Button
										label="Remove photo"
										variant="ghost"
										isDisabled={task.busy}
										onPress={(): void => {
											void task.run(() => replacePhoto(undefined));
										}}
									/>
								</>
							) : undefined}
						</Row>
						{photo.failed ? (
							<Button
								label="Retry photo"
								variant="ghost"
								onPress={photo.retry}
							/>
						) : undefined}
						{!photoOnly ? (
							<MemberProfileFields
								input={input}
								isDisabled={task.busy}
								onChange={(field, value): void =>
									setInput((current) => ({ ...current, [field]: value }))
								}
							/>
						) : undefined}
					</>
				)}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
