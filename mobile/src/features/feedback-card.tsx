import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Button, Row, Stack, Surface, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { CoachingFeedback } from "../domain/app-types";
import { FeedbackDelete } from "./feedback-delete";
import { FeedbackEditor } from "./feedback-editor";

export const FeedbackCard = ({
	entry,
	editable = false,
}: {
	entry: CoachingFeedback;
	editable?: boolean;
}): ReactElement => {
	const { account, busy, dispatch } = useApp();
	return (
		<Surface>
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
							<Button
								label="Publish"
								isLoading={busy}
								onPress={(): void => {
									void dispatch({ type: "publish-feedback", id: entry.id });
								}}
							/>
						) : undefined}
					</Row>
				) : undefined}
			</Stack>
		</Surface>
	);
};
