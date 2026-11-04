import type { ReactElement } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import type { CoachingFeedback } from "../domain/app-types";
import { feedbackAudienceLabel } from "../domain/feedback-audience";
import { ConfirmButton } from "./confirm-button";
import { FeedbackAudience } from "./feedback-audience";
export const FeedbackPublish = ({
	entry,
}: {
	entry: CoachingFeedback;
}): ReactElement => {
	const { dispatch } = useApp();
	const { busy } = useAppStatus();
	return (
		<FeedbackAudience personId={entry.personId} enabled>
			{(names) => (
				<ConfirmButton
					label="Publish"
					title="Publish feedback?"
					description={
						names
							? `Share with ${feedbackAudienceLabel(names)}. Published feedback can’t be edited or deleted.`
							: "Loading recipients…"
					}
					confirmLabel="Publish"
					isDisabled={busy || !names?.length}
					onConfirm={() => dispatch({ type: "publish-feedback", id: entry.id })}
				/>
			)}
		</FeedbackAudience>
	);
};
