import type { ReactElement } from "react";
import { FormattedText, Stack } from "../design-system";
import type { SessionPlanDraft } from "../domain/session-plan";
import { SessionPlanMedia } from "./session-plan-media";

export const SessionPlanDetails = ({
	plan,
}: {
	plan: Pick<SessionPlanDraft, "body" | "media">;
}): ReactElement => {
	const body = plan.body;
	const media = plan.media;
	return (
		<Stack gap="sm">
			{body ? <FormattedText>{body}</FormattedText> : undefined}
			{media.map((attachment) => (
				<SessionPlanMedia key={attachment.id} media={attachment} />
			))}
		</Stack>
	);
};
