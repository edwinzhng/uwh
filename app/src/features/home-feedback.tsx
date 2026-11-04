import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EditorialQuote, featureIdentity, SummaryCard } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { HomeFeedbackHighlight } from "../domain/home-feedback";

export const HomeFeedback = ({
	highlight,
}: {
	highlight: HomeFeedbackHighlight;
}): ReactElement => {
	const router = useRouter();
	const { accounts } = useApp();
	const entry = highlight.entry;
	const author =
		entry.authorName ??
		accounts.find((account) => account.id === entry.authorId)?.name;
	return (
		<SummaryCard
			title="Coach feedback"
			compact
			icon={featureIdentity.feedback.icon}
			category={featureIdentity.feedback.category}
			metadata={[author ? `From ${author}` : undefined, formatDate(entry.date)]
				.filter(Boolean)
				.join(" · ")}
			onPress={(): void =>
				router.push({
					pathname: "/account",
					params: {
						tab: "feedback",
						...(entry.eventId ? { event: entry.eventId } : {}),
					},
				})
			}
			accessibilityLabel={`Coach feedback. ${entry.body}. Open feedback for the selected player`}
		>
			<EditorialQuote text={entry.body} />
		</SummaryCard>
	);
};
