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
	List,
	ListItem,
	Row,
	Select,
	Stack,
	Tabs,
	Text,
} from "../design-system";
import {
	initialResourceAudience,
	type Resource,
	type ResourceAudience,
	type ResourceCategory,
	type ResourceDraft,
	type ResourceFile,
	type ResourceFilePurpose,
	type ResourceKind,
	resourceCategories,
	resourceUrl,
	validateResource,
} from "../domain/resources";
import { ResourcePlayerPicker } from "./resource-player-picker";
import { ResourceProgramPicker } from "./resource-program-picker";
import { ResourceThumbnailEditor } from "./resource-thumbnail-editor";
import { ResourceVoiceEditor } from "./resource-voice-editor";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

const audienceOptions: { value: ResourceAudience; label: string }[] = [
	{ value: "club", label: "Everyone in the club" },
	{ value: "coaches", label: "Coaches and admins" },
	{ value: "programs", label: "Selected programs and staff" },
	{ value: "players", label: "Tagged players, guardians and staff" },
];

export const ResourceEditor = ({
	previous,
	initialKind,
	initialPersonId,
	state,
	onClose,
	onSaved,
}: {
	previous?: Resource;
	initialKind?: ResourceKind;
	initialPersonId?: string;
	state: ResourceState;
	onClose: () => void;
	onSaved: (id: string) => void;
}): ReactElement => {
	const { data, account } = useApp();
	const review = useReviewFlow();
	const [panel, setPanel] = useState<"details" | "media" | "sharing">(
		review === "video-annotations"
			? "media"
			: review === "resource-programs"
				? "sharing"
				: "details",
	);
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
			(review === "resource-programs"
				? "programs"
				: initialResourceAudience(initialPersonId)),
	);
	const [personIds, setPersonIds] = useState(
		previous?.personIds ?? (initialPersonId ? [initialPersonId] : []),
	);
	const [programIds, setProgramIds] = useState(previous?.programIds ?? []);
	const [personNames, setPersonNames] = useState<Record<string, string>>(
		previous?.personNames ??
			Object.fromEntries(
				data.members.map((member) => [member.id, member.name]),
			),
	);
	const [url, setUrl] = useState(previous?.url ?? "");
	const [source, setSource] = useState<"link" | "upload">(
		previous?.fileId || review === "video-upload" ? "upload" : "link",
	);
	const [picked, setPicked] = useState<PickedResourceFile>();
	const [uploaded, setUploaded] = useState<ResourceFile>();
	const [category, setCategory] = useState<ResourceCategory>(
		previous?.category ?? "other",
	);
	const [sessionNumber, setSessionNumber] = useState(
		previous?.sessionNumber?.toString() ?? "",
	);
	const [thumbnail, setThumbnail] = useState<PickedResourceFile>();
	const [thumbnailUpload, setThumbnailUpload] = useState<ResourceFile>();
	const [thumbnailRemoved, setThumbnailRemoved] = useState(false);
	const [voice, setVoice] = useState<PickedResourceFile>();
	const [voiceUpload, setVoiceUpload] = useState<ResourceFile>();
	const [voiceRemoved, setVoiceRemoved] = useState(false);
	const [voiceTranscript, setVoiceTranscript] = useState(
		previous?.voiceTranscript ?? "",
	);
	const [recording, setRecording] = useState(false);
	const disabled = task.busy || recording;
	const fileId =
		uploaded?.id ??
		(!picked && previous?.kind === kind ? previous?.fileId : undefined);
	const thumbnailFileId =
		thumbnailUpload?.id ??
		(!thumbnail && !thumbnailRemoved ? previous?.thumbnailFileId : undefined);
	const voiceFileId =
		voiceUpload?.id ??
		(!voice && !voiceRemoved ? previous?.voiceFileId : undefined);
	const changeThumbnail = (value: PickedResourceFile | undefined): void => {
		setThumbnail(value);
		setThumbnailUpload(undefined);
		setThumbnailRemoved(!value);
	};
	const changeVoice = (value: PickedResourceFile | undefined): void => {
		setVoice(value);
		setVoiceUpload(undefined);
		setVoiceRemoved(!value);
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
		category: kind === "document" ? category : undefined,
		sessionNumber:
			kind === "video" && sessionNumber.trim()
				? Number(sessionNumber)
				: undefined,
		thumbnailFileId: kind === "video" ? thumbnailFileId : undefined,
		voiceFileId: kind === "video" ? voiceFileId : undefined,
		voiceTranscript:
			kind === "video" ? voiceTranscript.trim() || undefined : undefined,
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
		if (recording) return;
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
					voiceFileId:
						kind === "video" && voice ? "pending-voice" : draft.voiceFileId,
				}),
			async (): Promise<void> => {
				const [file, thumbFile, voiceFile] = await Promise.all([
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
					kind === "video"
						? uploadPicked(voice, voiceUpload, "voice", setVoiceUpload)
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
					voiceFileId:
						kind === "video" ? (voiceFile?.id ?? voiceFileId) : undefined,
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
			title={previous ? "Edit resource" : "Add resource"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !disabled) onClose();
			}}
			footer={
				<Stack grow>
					<Row justify="between" wrap>
						<ActionMenu
							label="Permissions"
							accessibilityLabel={`Permissions: ${audienceOptions.find((option) => option.value === audience)?.label}`}
							compact
							isDisabled={disabled}
							groups={[
								{
									id: "audience",
									label: "Who can view",
									items: audienceOptions.map((option) => ({
										id: option.value,
										label: option.label,
										checked: audience === option.value,
										onSelect: (): void => {
											setAudience(option.value);
											if (
												option.value === "players" ||
												option.value === "programs"
											)
												setPanel("sharing");
										},
									})),
								},
								{
									id: "recipients",
									items: [
										{
											id: "manage",
											label: "Manage recipients",
											icon: "users",
											onSelect: (): void => setPanel("sharing"),
										},
									],
								},
							]}
						/>
						<Button
							label="Save"
							isLoading={task.busy}
							isDisabled={recording}
							onPress={(): void => {
								void save();
							}}
						/>
					</Row>
				</Stack>
			}
		>
			<Stack>
				<Tabs
					label="Resource editor"
					value={panel}
					onValueChange={setPanel}
					options={[
						{ value: "details", label: "Details", isDisabled: disabled },
						...(kind === "video"
							? [
									{
										value: "media" as const,
										label: "Media",
										isDisabled: disabled,
									},
								]
							: []),
						{ value: "sharing", label: "Sharing", isDisabled: disabled },
					]}
				/>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				{panel === "details" ? (
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
						{kind === "document" ? (
							<Select
								label="Document category"
								value={category}
								options={resourceCategories}
								isDisabled={disabled}
								onValueChange={(value): void => {
									if (value) setCategory(value);
								}}
							/>
						) : (
							<Field
								label="Session number (optional)"
								value={sessionNumber}
								onValueChange={setSessionNumber}
								inputMode="numeric"
								isDisabled={disabled}
							/>
						)}
						<Select
							label="Add"
							value={source}
							isDisabled={disabled}
							options={[
								{ value: "link", label: "Web link" },
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
								label={kind === "video" ? "Video link" : "Link"}
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
						<Field
							label="Description or coaching note"
							value={description}
							onValueChange={setDescription}
							multiline
							isDisabled={disabled}
						/>
					</Stack>
				) : undefined}
				{kind === "video" && panel === "media" ? (
					<Stack>
						<ResourceThumbnailEditor
							state={state}
							previous={
								source === "upload" && previous?.kind === "video"
									? previous
									: previous?.kind === "video" && !picked
										? previous
										: undefined
							}
							main={source === "upload" ? picked : undefined}
							value={thumbnail}
							removed={thumbnailRemoved}
							disabled={disabled}
							task={task}
							onChange={changeThumbnail}
						/>
						<ResourceVoiceEditor
							state={state}
							previous={previous?.kind === "video" ? previous : undefined}
							value={voice}
							removed={voiceRemoved}
							task={task}
							onChange={changeVoice}
							onRecordingChange={setRecording}
						/>
						<Field
							label="Voice transcript (optional)"
							value={voiceTranscript}
							onValueChange={setVoiceTranscript}
							multiline
							isDisabled={disabled}
						/>
					</Stack>
				) : undefined}
				{panel === "sharing" ? (
					<Stack>
						<Select
							label="Who can view"
							value={audience}
							isDisabled={disabled}
							options={audienceOptions}
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
						<ResourcePlayerPicker
							selected={personIds}
							disabled={disabled}
							onSelect={(id, name): void => {
								setPersonIds((ids) => [...ids, id]);
								setPersonNames((current) => ({ ...current, [id]: name }));
							}}
						/>
						{personIds.length ? (
							<List>
								{personIds.map((personId) => (
									<ListItem
										key={personId}
										title={personNames[personId] ?? "Player"}
										trailing={
											<Button
												label="Remove"
												compact
												variant="ghost"
												isDisabled={disabled}
												onPress={(): void =>
													setPersonIds((ids) =>
														ids.filter((id) => id !== personId),
													)
												}
											/>
										}
									/>
								))}
							</List>
						) : undefined}
					</Stack>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
