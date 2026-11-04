import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Divider, EmptyState, Row, Stack, Text } from "../design-system";
import { feedbackKind } from "../domain/feedback-access";
import { DataPage } from "./data-page";
import { FeedbackCard } from "./feedback-card";
export const FeedbackList = ({
	personId,
	visibility,
	kind = "coaching",
	embedded = false,
	hideEmpty = false,
	compactEmpty = false,
}: {
	personId: string;
	embedded?: boolean;
	hideEmpty?: boolean;
	compactEmpty?: boolean;
	visibility: "published" | "private";
	kind?: "coaching" | "shoutout";
}): ReactElement => {
	const { data } = useApp();
	const preview = data.feedback
		.filter(
			(entry) =>
				entry.personId === personId &&
				feedbackKind(entry) === kind &&
				(entry.visibility === "published") === (visibility === "published"),
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	return (
		<DataPage
			config={{
				query: api.pages.feedback,
				args: { personId, visibility, kind },
				preview,
				size: 10,
			}}
		>
			{(items) =>
				!items.length && hideEmpty ? undefined : (
					<Stack gap="sm">
						{embedded && visibility === "private" ? (
							<>
								<Divider />
								<Row>
									<Text variant="label">Drafts & private feedback</Text>
								</Row>
							</>
						) : undefined}
						{items.map((entry) => (
							<FeedbackCard
								key={entry.id}
								entry={entry}
								embedded={embedded}
								editable={visibility === "private"}
							/>
						))}
						{!items.length ? (
							compactEmpty ? (
								<Text variant="small" tone="secondary">
									No shared feedback.
								</Text>
							) : (
								<EmptyState
									title={
										visibility === "published"
											? kind === "shoutout"
												? "No shoutouts"
												: "No shared coaching feedback"
											: "No drafts or private feedback"
									}
								/>
							)
						) : undefined}
					</Stack>
				)
			}
		</DataPage>
	);
};
