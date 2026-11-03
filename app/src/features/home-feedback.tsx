import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Stack, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { homeFeedbackHighlight } from "../domain/home-feedback";

export const HomeFeedback = ({
	highlight,
}: {
	highlight: NonNullable<ReturnType<typeof homeFeedbackHighlight>>;
}): ReactElement => {
	const router = useRouter();
	const { accounts } = useApp();
	const author =
		highlight.kind === "note"
			? (highlight.entry.authorName ??
				accounts.find((account) => account.id === highlight.entry.authorId)
					?.name)
			: highlight.entry.authorName;
	const linkedEventId =
		highlight.kind === "rating" && highlight.entry.dateKind === "recorded"
			? undefined
			: highlight.entry.eventId;
	const recorded =
		highlight.kind === "rating" && highlight.entry.dateKind === "recorded";
	const date =
		highlight.kind === "note"
			? highlight.entry.date
			: highlight.entry.eventDate;
	return (
		<SummaryCard
			title="Feedback"
			icon="message"
			category="violet"
			metadata={`${recorded ? "Recorded " : ""}${formatDate(date)}`}
			onPress={(): void =>
				router.push({
					pathname: "/account",
					params: {
						tab: "feedback",
						feedback: "coach",
						...(linkedEventId ? { event: linkedEventId } : {}),
					},
				})
			}
			accessibilityLabel={`Coach feedback. ${highlight.kind === "note" ? highlight.entry.body : `${highlight.entry.rating}/10. ${highlight.entry.comments || highlight.entry.eventTitle}`}. Open feedback for the selected player`}
		>
			<Stack gap="xs">
				{highlight.kind === "note" ? (
					<>
						<Text>{highlight.entry.body}</Text>
						<Text variant="caption" tone="secondary">
							{author ? `${author} · Coach note` : "Coach note"}
						</Text>
					</>
				) : (
					<>
						<Text variant="label">{highlight.entry.eventTitle}</Text>
						<Text>
							{highlight.entry.comments ||
								`${highlight.entry.rating}/10 session rating`}
						</Text>
						<Text variant="caption" tone="secondary">
							{highlight.entry.authorName} · {highlight.entry.rating}/10
						</Text>
					</>
				)}
			</Stack>
		</SummaryCard>
	);
};
