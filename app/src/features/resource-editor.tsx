import { type ReactElement, useState } from "react";
import { readImageBytes } from "../backend/image-bytes";
import {
	type PickedResourceFile,
	pickResourceFile,
} from "../backend/pick-resource-file";
import type { ResourceState } from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	captureVideoThumbnail,
	createMediaAsset,
	Dialog,
	Field,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import {
	type Resource,
	type ResourceAudience,
	type ResourceDraft,
	type ResourceFile,
	type ResourceFilePurpose,
	type ResourceKind,
	resourceUrl,
	validateResource,
} from "../domain/resources";
import { ResourceProgramPicker } from "./resource-program-picker";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

const audienceOptions: { value: ResourceAudience; label: string }[] = [
	{ value: "club", label: "Club" },
	{ value: "programs", label: "Programs" },
	{ value: "coaches", label: "Coaches" },
];

export const ResourceEditor = ({
	previous,
	initialKind,
	state,
	onClose,
	onSaved,
}: {
	previous?: Resource;
	initialKind?: ResourceKind;
	state: ResourceState;
	onClose: () => void;
	onSaved: (id: string) => void;
}): ReactElement => {
	const { account } = useApp();
	const review = useReviewFlow();
	const [sharing, setSharing] = useState(false);
	const task = useFormTask();
	const operationKey = useOperationKey();
	const [title, setTitle] = useState(previous?.title ?? "");
	const [description, setDescription] = useState(previous?.description ?? "");
	const [kind, setKind] = useState<ResourceKind>(
		previous?.kind ??
			initialKind ??
			(review === "video-upload" ? "video" : "document"),
	);
	const [audience, setAudience] = useState<ResourceAudience>(
		previous?.audience ??
			(review === "resource-programs" ? "programs" : "coaches"),
	);
	const personIds = previous?.personIds ?? [];
	const [programIds, setProgramIds] = useState(previous?.programIds ?? []);
	const audienceLocked =
		previous?.audience === "players" || previous?.audience === "coaches";
	const availableAudienceOptions = audienceLocked
		? [
				{
					value: previous.audience,
					label:
						previous.audience === "players"
							? "Existing private recipients"
							: "Coaches and admins",
				},
			]
		: audienceOptions;
	const [url, setUrl] = useState(previous?.url ?? "");
	const [source, setSource] = useState<"link" | "upload">(
		previous?.fileId || review === "video-upload" ? "upload" : "link",
	);
	const [picked, setPicked] = useState<PickedResourceFile>();
	const [uploaded, setUploaded] = useState<ResourceFile>();
	const [thumbnail, setThumbnail] = useState<PickedResourceFile>();
	const [thumbnailUpload, setThumbnailUpload] = useState<ResourceFile>();
	const [thumbnailRemoved, setThumbnailRemoved] = useState(false);
	const disabled = task.busy;
	const fileId =
		uploaded?.id ??
		(!picked && previous?.kind === kind ? previous?.fileId : undefined);
	const thumbnailFileId =
		thumbnailUpload?.id ??
		(!thumbnail && !thumbnailRemoved ? previous?.thumbnailFileId : undefined);
	const voiceFileId = previous?.voiceFileId;
	const changeThumbnail = (value: PickedResourceFile | undefined): void => {
		setThumbnail(value);
		setThumbnailUpload(undefined);
		setThumbnailRemoved(!value);
	};
	const draft: ResourceDraft = {
		title,
		description,
		kind,
		audience,
		personIds,
		programIds: audience === "programs" ? programIds : undefined,
		url: source === "link" ? url.trim() || undefined : undefined,
		fileId: source === "upload" ? fileId : undefined,
		category: kind === "document" ? (previous?.category ?? "other") : undefined,
		sessionNumber: kind === "video" ? previous?.sessionNumber : undefined,
		thumbnailFileId: kind === "video" ? thumbnailFileId : undefined,
		voiceFileId: kind === "video" ? voiceFileId : undefined,
		voiceTranscript: kind === "video" ? previous?.voiceTranscript : undefined,
	};
	const uploadPicked = async (
		file: PickedResourceFile | undefined,
		cached: ResourceFile | undefined,
		purpose: ResourceFilePurpose,
		onUploaded: (file: ResourceFile) => void,
	): Promise<ResourceFile | undefined> => {
		if (!file || cached) return cached;
		const result = await state.upload(file.blob, file.name, purpose);
		onUploaded(result);
		return result;
	};
	const save = async (): Promise<void> => {
		await task.submit(
			(): string | undefined =>
				validateResource({
					...draft,
					fileId:
						source === "upload" && picked ? "pending-primary" : draft.fileId,
					thumbnailFileId:
						kind === "video" && thumbnail
							? "pending-thumbnail"
							: draft.thumbnailFileId,
				}),
			async (): Promise<void> => {
				const [file, thumbFile] = await Promise.all([
					source === "upload"
						? uploadPicked(picked, uploaded, kind, setUploaded)
						: undefined,
					kind === "video"
						? uploadPicked(
								thumbnail,
								thumbnailUpload,
								"thumbnail",
								setThumbnailUpload,
							)
						: undefined,
				]);
				const value: ResourceDraft = {
					...draft,
					title: draft.title.trim(),
					description: draft.description.trim(),
					personIds: draft.personIds.slice().sort(),
					url: draft.url ? resourceUrl(draft.url) : undefined,
					fileId: source === "upload" ? (file?.id ?? fileId) : undefined,
					thumbnailFileId:
						kind === "video" ? (thumbFile?.id ?? thumbnailFileId) : undefined,
				};
				const id = await state.save(
					value,
					operationKey(
						JSON.stringify({
							actorId: account.id,
							personId: account.personId,
							id: previous?.id,
							revision: previous?.revision ?? 0,
							value,
						}),
					),
					previous,
				);
				onSaved(id);
			},
		);
	};
	const pick = async (): Promise<void> => {
		await task.run(async (): Promise<void> => {
			const file = await pickResourceFile(kind);
			if (!file) return;
			setPicked(file);
			setUploaded(undefined);
			if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
			if (kind === "video") {
				changeThumbnail(undefined);
				const asset = await createMediaAsset(
					await readImageBytes(file.blob),
					file.name,
					file.blob.type,
				);
				try {
					changeThumbnail({
						name: "video-thumbnail.jpg",
						blob: await captureVideoThumbnail(asset.uri),
					});
				} finally {
					asset.dispose();
				}
			}
		});
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={disabled}
			title={previous ? "Edit file" : "Add file"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !disabled) onClose();
			}}
			footer={
				<Stack grow>
					<Row justify="between" wrap>
						<ActionMenu
							label="Permissions"
							accessibilityLabel={`Permissions: ${availableAudienceOptions.find((option) => option.value === audience)?.label}`}
							compact
							isDisabled={disabled || audienceLocked}
							groups={[
								{
									id: "audience",
									label: "Who can view",
									items: availableAudienceOptions.map((option) => ({
										id: option.value,
										label: option.label,
										checked: audience === option.value,
										onSelect: (): void => {
											setAudience(option.value);
											if (option.value === "programs") setSharing(true);
										},
									})),
								},
								{
									id: "recipients",
									items: [
										{
											id: "manage",
											label: "Sharing settings",
											icon: "users",
											onSelect: (): void => setSharing(true),
										},
									],
								},
							]}
						/>
						<Button
							label="Save"
							isLoading={task.busy}
							isDisabled={disabled}
							onPress={(): void => {
								void save();
							}}
						/>
					</Row>
				</Stack>
			}
		>
			<Stack>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<Stack>
					<Field
						label="Title"
						value={title}
						onValueChange={setTitle}
						isDisabled={disabled}
					/>
					<Select
						label="Type"
						value={kind}
						isDisabled={disabled}
						options={[
							{ value: "document", label: "Document" },
							{ value: "video", label: "Video" },
						]}
						onValueChange={(value): void => {
							if (value) {
								setKind(value);
								setSource("link");
								setPicked(undefined);
								setUploaded(undefined);
								task.clear();
							}
						}}
					/>
					<Field
						label="Description"
						value={description}
						onValueChange={setDescription}
						multiline
						isDisabled={disabled}
					/>
					<Select
						label="Source"
						value={source}
						isDisabled={disabled}
						options={[
							{ value: "link", label: "Supported link" },
							{
								value: "upload",
								label: kind === "video" ? "Upload video" : "Upload document",
							},
						]}
						onValueChange={(value): void => {
							if (value) {
								setSource(value);
								task.clear();
							}
						}}
					/>
					{source === "link" ? (
						<Field
							label={
								kind === "video" ? "YouTube or Vimeo link" : "Document link"
							}
							value={url}
							onValueChange={setUrl}
							placeholder="https://"
							isDisabled={disabled}
						/>
					) : (
						<Stack gap="xs">
							<Row>
								<Button
									label={
										picked || previous?.fileName
											? `Replace ${kind}`
											: `Choose ${kind}`
									}
									prefix="plus"
									variant="secondary"
									isDisabled={disabled}
									onPress={(): void => {
										void pick();
									}}
								/>
							</Row>
							<Text variant="small" tone="secondary">
								{picked?.name ??
									previous?.fileName ??
									(kind === "video"
										? "MP4, MOV or WebM · up to 50 MB"
										: "PDF, images, DOCX, XLSX, PPTX, OpenDocument, CSV or text · up to 10 MB")}
							</Text>
						</Stack>
					)}
				</Stack>
				{sharing ? (
					<Dialog title="Permissions" isOpen onOpenChange={setSharing}>
						<Stack>
							<Select
								label="Who can view"
								value={audience}
								isDisabled={disabled || audienceLocked}
								options={availableAudienceOptions}
								onValueChange={(value): void => {
									if (value) setAudience(value);
								}}
							/>
							{audience === "programs" ? (
								<ResourceProgramPicker
									selected={programIds}
									disabled={disabled}
									onChange={setProgramIds}
								/>
							) : undefined}
							{audienceLocked ? (
								<Text variant="small" tone="secondary">
									Existing private access is preserved.
								</Text>
							) : undefined}
						</Stack>
					</Dialog>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
