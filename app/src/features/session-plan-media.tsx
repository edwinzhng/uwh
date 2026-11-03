import type { ReactElement } from "react";
import { Stack, Text } from "../design-system";
import type { SessionPlanMedia as PlanMedia } from "../domain/session-plan";
import { SessionPlanLinkMedia } from "./session-plan-link-media";
import { SessionPlanResourceMedia } from "./session-plan-resource-media";

export const SessionPlanMedia = ({
	media,
}: {
	media: PlanMedia;
}): ReactElement => (
	<Stack gap="xs">
		<Text variant="small" weight="medium">
			{media.label}
		</Text>
		{media.source === "resource" ? (
			<SessionPlanResourceMedia resourceId={media.resourceId} />
		) : (
			<SessionPlanLinkMedia url={media.url} label={media.label} />
		)}
	</Stack>
);
