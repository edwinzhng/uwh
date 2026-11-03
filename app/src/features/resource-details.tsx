import { type ReactElement, useState } from "react";
import type { ResourceState } from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Divider,
	EmptyState,
	ExternalVideo,
	Field,
	List,
	ListItem,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { programName } from "../domain/programs";
import {
	type Resource,
	resourceCategories,
	validateResourceComment,
} from "../domain/resources";
import { ConfirmButton } from "./confirm-button";
import { ResourcePlayback } from "./resource-playback";
import { ResourceThumbnail } from "./resource-thumbnail";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const ResourceDetails = ({
	state,
	canManage,
	onEdit,
}: {
	state: ResourceState;
	canManage: boolean;
	onEdit: (resource: Resource) => void;
}): ReactElement | undefined => {
	const { account, data } = useApp();
	const task = useFormTask();
	const [body, setBody] = useState("");
	const [submission, setSubmission] = useState(0);
	const operationKey = useOperationKey();
	const detail = state.detail;
	if (!detail) return undefined;
	const { resource, comments } = detail;
	const submit = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined => validateResourceComment(body),
				async (): Promise<void> =>
					state.comment(
						resource.id,
						body.trim(),
						operationKey(
							JSON.stringify({
								resourceId: resource.id,
								actorId: account.id,
								body: body.trim(),
								submission,
							}),
						),
					),
			)
		) {
			setBody("");
			setSubmission((count) => count + 1);
		}
	};
	return (
		<Stack gap="xl">
			<Surface>
				<Stack>
					{resource.kind === "video" ? (
						resource.fileId ? (
							<ResourcePlayback
								key={`${resource.id}:${resource.revision}`}
								state={state}
								resource={resource}
								slot="primary"
							/>
						) : resource.url ? (
							<ExternalVideo url={resource.url} label={resource.title} />
						) : (
							<ResourceThumbnail state={state} resource={resource} />
						)
					) : undefined}
					<Row wrap>
						<Badge label={resource.kind === "video" ? "Video" : "Document"} />
						<Badge
							label={
								resource.audience === "club"
									? "Club"
									: resource.audience === "coaches"
										? "Coaches and admins"
										: resource.audience === "programs"
											? "Selected programs and staff"
											: "Tagged players, guardians and staff"
							}
						/>
						{resource.archived ? <Badge label="Archived" /> : undefined}
						{resource.kind === "document" ? (
							<Badge
								label={
									resourceCategories.find(
										(category) =>
											category.value === (resource.category ?? "other"),
									)?.label ?? "Other"
								}
							/>
						) : resource.sessionNumber ? (
							<Badge label={`Session ${resource.sessionNumber}`} />
						) : undefined}
					</Row>
					{resource.description ? (
						<Text>{resource.description}</Text>
					) : undefined}
					{resource.programIds?.length ? (
						<Text variant="small" tone="secondary">
							{resource.programIds
								.map((id) => programName(data, id))
								.join(" · ")}
						</Text>
					) : undefined}
					{resource.personIds.length ? (
						<Text variant="small" tone="secondary">
							{resource.personIds
								.map(
									(id) =>
										resource.personNames?.[id] ??
										data.members.find((member) => member.id === id)?.name ??
										"Player",
								)
								.join(" · ")}
						</Text>
					) : undefined}
					<Row wrap>
						{resource.kind !== "video" ? (
							<Button
								label={resource.fileId ? "Open document" : "Open link"}
								prefix={resource.fileId ? "download" : "arrowRight"}
								isLoading={task.busy}
								onPress={(): void => {
									void task.run(() => state.open(resource));
								}}
							/>
						) : undefined}
						{canManage ? (
							<>
								<Button
									label="Edit"
									prefix="edit"
									variant="ghost"
									isDisabled={task.busy}
									onPress={(): void => onEdit(resource)}
								/>
								<ConfirmButton
									label={resource.archived ? "Restore" : "Archive"}
									title={
										resource.archived
											? "Restore resource?"
											: "Archive resource?"
									}
									description={
										resource.archived
											? "Return this resource to the active library."
											: "Move this resource out of the active library. You can restore it later."
									}
									confirmLabel={resource.archived ? "Restore" : "Archive"}
									variant="ghost"
									isDisabled={task.busy}
									onConfirm={(): Promise<boolean> =>
										task.run(() => state.archive(resource, !resource.archived))
									}
								/>
							</>
						) : undefined}
					</Row>
					{resource.voiceFileId ? (
						<Stack gap="xs">
							<Text variant="label">Coach voice note</Text>
							<ResourcePlayback
								key={`${resource.id}:${resource.revision}:voice`}
								state={state}
								resource={resource}
								slot="voice"
							/>
						</Stack>
					) : undefined}
					{resource.voiceTranscript ? (
						<Stack gap="xs">
							<Text variant="caption" tone="secondary">
								Voice transcript
							</Text>
							<Text>{resource.voiceTranscript}</Text>
						</Stack>
					) : undefined}
				</Stack>
			</Surface>
			<Stack gap="sm">
				<SectionHeading>Comments and feedback</SectionHeading>
				<Surface>
					<Stack>
						<Text variant="small" tone="secondary">
							Shared with everyone who can view this resource.
						</Text>
						{!resource.archived ? (
							<>
								<Field
									label="Comment"
									value={body}
									onValueChange={setBody}
									multiline
									isDisabled={task.busy}
								/>
								<Row justify="end">
									<Button
										label="Post comment"
										isLoading={task.busy}
										onPress={(): void => {
											void submit();
										}}
									/>
								</Row>
								<Divider />
							</>
						) : undefined}
						{comments.length ? (
							<List>
								{comments.map((comment) => (
									<ListItem
										key={comment.id}
										title={comment.authorName}
										description={comment.body}
										trailing={
											comment.authorId === account.id || canManage ? (
												<ConfirmButton
													label="Remove"
													title="Remove comment?"
													description="Remove this comment from the resource discussion."
													confirmLabel="Remove"
													danger
													variant="ghost"
													isDisabled={task.busy}
													onConfirm={(): Promise<boolean> =>
														task.run(() => state.removeComment(comment.id))
													}
												/>
											) : undefined
										}
									/>
								))}
							</List>
						) : (
							<EmptyState title="No comments" />
						)}
						{detail.limited ? (
							<Text variant="small" tone="secondary">
								Showing the latest 100 comments.
							</Text>
						) : undefined}
					</Stack>
				</Surface>
			</Stack>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
