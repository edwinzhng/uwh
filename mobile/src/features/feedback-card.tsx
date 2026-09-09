import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Row, Stack, Surface, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { CoachingFeedback } from "../domain/app-types";
import { ConfirmButton } from "./confirm-button";
import { FeedbackDelete } from "./feedback-delete";
import { FeedbackEditor } from "./feedback-editor";

export const FeedbackCard = ({
	entry,
	editable = false,
	embedded = false,
}: {
	entry: CoachingFeedback;
	editable?: boolean;
	embedded?: boolean;
}): ReactElement => {
	const { account, busy, dispatch } = useApp();
	const Container = embedded ? Stack : Surface;
	return (
		<Container>
			<Stack gap="sm">
				<Row justify="between" wrap>
					<Badge
						label={
							entry.visibility === "published"
								? "Shared"
								: entry.visibility === "private"
									? "Coaches only"
									: "Draft"
						}
						kind={entry.visibility === "published" ? "neutral" : "coach"}
					/>
					<Text variant="caption" tone="secondary">
						{formatDate(entry.date)}
					</Text>
				</Row>
				<Text variant="small">{entry.body}</Text>
				{editable &&
				entry.authorId === account.id &&
				entry.visibility !== "published" ? (
					<Row justify="end" wrap>
						<FeedbackEditor personId={entry.personId} existing={entry} />
						<FeedbackDelete id={entry.id} />
						{entry.visibility === "draft" ? (
							<ConfirmButton
								label="Publish"
								title="Publish feedback?"
								description="This feedback will be shared with the player and linked parents. It can’t be edited or deleted after publishing."
								confirmLabel="Publish"
								isDisabled={busy}
								onConfirm={() =>
									dispatch({ type: "publish-feedback", id: entry.id })
								}
							/>
						) : undefined}
					</Row>
				) : undefined}
			</Stack>
		</Container>
	);
};
