import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Row, Stack, Surface, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { CoachingFeedback } from "../domain/app-types";
import { feedbackKind } from "../domain/feedback-access";
import { shoutoutLabel } from "../domain/shoutouts";
import { ContentReport } from "./content-report";
import { FeedbackDelete } from "./feedback-delete";
import { FeedbackEditor } from "./feedback-editor";
import { FeedbackPublish } from "./feedback-publish";
import { ShoutoutModeration } from "./shoutout-moderation";

export const FeedbackCard = ({
	entry,
	editable = false,
	embedded = false,
	recipientName,
}: {
	entry: CoachingFeedback;
	editable?: boolean;
	embedded?: boolean;
	recipientName?: string;
}): ReactElement => {
	const { account, accounts, data } = useApp();
	const isShoutout = feedbackKind(entry) === "shoutout";
	const content = (
		<Stack gap="sm">
			<Row gap="xs" wrap>
				{isShoutout && entry.visibility === "published" ? (
					<Text variant="label">⭐ {shoutoutLabel(entry.category)}</Text>
				) : entry.visibility !== "published" ? (
					<Badge
						label={entry.visibility === "private" ? "Coaches only" : "Draft"}
						kind="coach"
					/>
				) : undefined}
				<Text variant="caption" tone="secondary">
					{feedbackKind(entry) === "coaching"
						? `From ${entry.authorName ?? accounts.find((actor) => actor.id === entry.authorId)?.name ?? "Coach"} · `
						: ""}
					{formatDate(entry.date)}
				</Text>
				{account.admin && isShoutout ? (
					<ShoutoutModeration id={entry.id} />
				) : undefined}
			</Row>
			{isShoutout ? (
				<Text variant="h4">
					{recipientName ??
						data.members.find((person) => person.id === entry.personId)?.name ??
						"Player"}
				</Text>
			) : undefined}
			{entry.body ? <Text>{entry.body}</Text> : undefined}
			{entry.authorId !== account.id ? (
				<ContentReport
					source={{ kind: "feedback", id: entry.id }}
					label={isShoutout ? "Report shoutout" : "Report feedback"}
				/>
			) : undefined}
			{editable &&
			entry.authorId === account.id &&
			entry.visibility !== "published" ? (
				<Row justify="end" wrap>
					<FeedbackEditor personId={entry.personId} existing={entry} />
					<FeedbackDelete id={entry.id} />
					{entry.visibility === "draft" ? (
						<FeedbackPublish entry={entry} />
					) : undefined}
				</Row>
			) : undefined}
		</Stack>
	);
	return embedded ? (
		<Stack>{content}</Stack>
	) : (
		<Surface tone={isShoutout ? "amber" : undefined}>{content}</Surface>
	);
};
