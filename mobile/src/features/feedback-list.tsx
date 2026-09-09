import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Badge, Divider, Row, Stack, Text } from "../design-system";
import { DataPage } from "./data-page";
import { FeedbackCard } from "./feedback-card";
export const FeedbackList = ({
	personId,
	visibility,
	embedded = false,
	hideEmpty = false,
}: {
	personId: string;
	embedded?: boolean;
	hideEmpty?: boolean;
	visibility: "published" | "private";
}): ReactElement => {
	const { data } = useApp();
	const preview = data.feedback
		.filter(
			(entry) =>
				entry.personId === personId &&
				(entry.visibility === "published") === (visibility === "published"),
		)
		.toSorted((a, b) => b.date.localeCompare(a.date));
	return (
		<DataPage
			config={{
				query: api.pages.feedback,
				args: { personId, visibility },
				preview,
				size: 10,
			}}
		>
			{(items) =>
				!items.length && hideEmpty ? (
					<></>
				) : (
					<Stack gap="sm">
						{embedded && visibility === "private" ? (
							<>
								<Divider />
								<Row>
									<Text variant="label">Drafts & private notes</Text>
									<Badge label="Coach" kind="coach" compact />
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
							<Text variant="small" tone="secondary">
								{visibility === "published"
									? "No shared feedback"
									: "No drafts or private notes"}
							</Text>
						) : undefined}
					</Stack>
				)
			}
		</DataPage>
	);
};
