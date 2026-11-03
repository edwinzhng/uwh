import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { EmptyState, Stack } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { canReadFeedback, feedbackKind } from "../domain/feedback-access";
import { DataPage } from "./data-page";
import { FeedbackCard } from "./feedback-card";
import { ShoutoutEditor } from "./shoutout-editor";

export const SessionShoutouts = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account } = useApp();
	const shoutouts = data.feedback
		.filter(
			(entry) =>
				feedbackKind(entry) === "shoutout" &&
				entry.visibility === "published" &&
				entry.eventId === event.id &&
				canReadFeedback(
					entry,
					account,
					data.members.find((member) => member.id === entry.personId),
				),
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	return (
		<Stack gap="sm">
			<ShoutoutEditor event={event} />
			<DataPage
				config={{
					query: api.pages.sessionShoutouts,
					args: { eventId: event.id },
					preview: shoutouts,
					size: 10,
				}}
			>
				{(items) =>
					items.length ? (
						items.map((entry) => <FeedbackCard key={entry.id} entry={entry} />)
					) : (
						<EmptyState title="No shoutouts" />
					)
				}
			</DataPage>
		</Stack>
	);
};
