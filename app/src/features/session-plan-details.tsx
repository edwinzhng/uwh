import type { ReactElement } from "react";
import { FormattedText, Stack } from "../design-system";
import { planBodyBlocks, type SessionPlanDraft } from "../domain/session-plan";
import { SessionPlanImage } from "./session-plan-image";

export const SessionPlanDetails = ({
	plan,
}: {
	plan: Pick<SessionPlanDraft, "body" | "media">;
}): ReactElement => {
	return (
		<Stack gap="sm">
			{planBodyBlocks(plan).map((block) =>
				block.image ? (
					<SessionPlanImage key={block.image.id} image={block.image} />
				) : block.text ? (
					<FormattedText key={block.id}>{block.text}</FormattedText>
				) : undefined,
			)}
		</Stack>
	);
};
