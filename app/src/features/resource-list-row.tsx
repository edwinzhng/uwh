import type { ReactElement } from "react";
import type { ResourceState } from "../backend/use-resources";
import { useApp } from "../demo/app-state";
import { IconHint, NavigationCard } from "../design-system";
import { displayDate } from "../domain/date-display";
import { type Resource, youtubeThumbnail } from "../domain/resources";
import { ResourceThumbnail } from "./resource-thumbnail";

export const ResourceListRow = ({
	resource,
	state,
	onOpen,
}: {
	resource: Resource;
	state: ResourceState;
	onOpen: () => void;
}): ReactElement => {
	const { data } = useApp();
	const date = displayDate(
		resource.createdAt ?? resource.updatedAt,
		data.timeZone,
	);
	const access =
		resource.audience === "coaches"
			? "Visible to coaches and admins."
			: resource.audience === "programs"
				? "Visible to selected programs and staff."
				: resource.audience === "players"
					? "Visible to existing private recipients, their guardians and staff."
					: "Visible to the club.";
	const thumbnail =
		resource.kind === "video" &&
		Boolean(resource.thumbnailFileId || youtubeThumbnail(resource.url));
	return (
		<NavigationCard
			title={resource.title}
			description={date}
			icon={resource.kind === "document" ? "document" : "play"}
			label={`${resource.title}. ${date}. ${access}`}
			onPress={onOpen}
			trailing={
				thumbnail ? (
					<ResourceThumbnail state={state} resource={resource} compact />
				) : undefined
			}
			accessory={
				resource.audience !== "club" ? (
					<IconHint label="Restricted resource" text={access} icon="lock" />
				) : undefined
			}
		/>
	);
};
