import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Badge, Row, Stack, Text } from "../design-system";
import { feedbackKind } from "../domain/feedback-access";
import { shoutoutSummary } from "../domain/shoutouts";

type Summary = {
	total: number;
	categories: { label: string; count: number }[];
	limited: boolean;
};
const SummaryContent = ({
	summary,
}: {
	summary?: Summary;
}): ReactElement | undefined =>
	summary?.total ? (
		<Stack gap="xs">
			<Text variant="small" tone="secondary">
				{summary.limited
					? "Recent recognition · latest 200 shoutouts"
					: `${summary.total} shoutout${summary.total === 1 ? "" : "s"}`}
			</Text>
			<Row wrap>
				{summary.categories.map((entry) => (
					<Badge key={entry.label} label={`${entry.label} · ${entry.count}`} />
				))}
			</Row>
		</Stack>
	) : undefined;
const LiveSummary = ({ personId }: { personId: string }): ReactElement => (
	<>
		<SummaryContent summary={useQuery(api.pages.recognition, { personId })} />
	</>
);
export const RecognitionSummary = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const { source, data } = useApp();
	const entries = data.feedback
		.filter(
			(entry) =>
				entry.personId === personId &&
				feedbackKind(entry) === "shoutout" &&
				entry.visibility === "published",
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 201);
	return source === "convex" ? (
		<LiveSummary personId={personId} />
	) : (
		<SummaryContent
			summary={{
				total: Math.min(200, entries.length),
				categories: shoutoutSummary(entries.slice(0, 200)),
				limited: entries.length > 200,
			}}
		/>
	);
};
