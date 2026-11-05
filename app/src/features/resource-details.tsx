import type { ReactElement } from "react";
import type { ResourceState } from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import {
	Badge,
	ExternalVideo,
	IconHint,
	Row,
	Stack,
	Text,
} from "../design-system";
import { displayDate } from "../domain/date-display";
import type { Resource } from "../domain/resources";
import { ContentReport } from "./content-report";
import { ResourceActions } from "./resource-actions";
import { ResourceComments } from "./resource-comments";
import { ResourceDocument } from "./resource-document";
import { ResourcePlayback } from "./resource-playback";
import { ResourceThumbnail } from "./resource-thumbnail";

export const ResourceDetails = ({
	state,
	canManage,
	onEdit,
}: {
	state: ResourceState;
	canManage: boolean;
	onEdit: (resource: Resource) => void;
}): ReactElement | undefined => {
	const { data } = useApp();
	const detail = state.detail;
	if (!detail) return undefined;
	const { resource, comments } = detail;
	const restricted = resource.audience !== "club";
	const visibility =
		resource.audience === "coaches"
			? "Visible to coaching staff and administrators."
			: resource.audience === "programs"
				? "Visible to selected programs, their linked households and coaching staff."
				: "Visible to selected players, their linked households and coaching staff.";
	return (
		<Stack gap="xl">
			<Stack gap="sm">
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
				) : (
					<ResourceDocument state={state} resource={resource} />
				)}
				<Row justify="between" wrap>
					<Row gap="xs" wrap>
						<Text variant="caption" tone="secondary">
							{displayDate(
								resource.createdAt ?? resource.updatedAt,
								data.timeZone,
							)}
						</Text>
						{restricted ? (
							<IconHint
								label="Restricted resource"
								text={visibility}
								icon="lock"
							/>
						) : undefined}
						{resource.archived ? <Badge label="Archived" /> : undefined}
					</Row>
					<ResourceActions
						resource={resource}
						state={state}
						canManage={canManage}
						onEdit={onEdit}
					/>
				</Row>
				{resource.description ? <Text>{resource.description}</Text> : undefined}
				<ContentReport
					source={{
						kind: "resource",
						id: resource.id,
						revision: resource.revision,
					}}
					label="Report resource"
				/>
				{resource.voiceFileId || resource.voiceTranscript ? (
					<Stack gap="sm">
						{resource.voiceFileId ? (
							<ResourcePlayback
								key={`${resource.id}:${resource.revision}:voice`}
								state={state}
								resource={resource}
								slot="voice"
							/>
						) : undefined}
						{resource.voiceTranscript ? (
							<Text>{resource.voiceTranscript}</Text>
						) : undefined}
					</Stack>
				) : undefined}
			</Stack>
			<ResourceComments
				key={resource.id}
				state={state}
				resource={resource}
				comments={comments}
				limited={detail.limited}
				canManage={canManage}
			/>
		</Stack>
	);
};
