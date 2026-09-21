import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, Stack } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { FeedbackCard } from "./feedback-card";
import { ShoutoutEditor } from "./shoutout-editor";

export const SessionShoutouts = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data } = useApp();
	const shoutouts = data.feedback
		.filter(
			(entry) =>
				entry.visibility === "published" &&
				(entry.eventId === event.id ||
					(!entry.eventId && entry.date === event.date)),
		)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	return (
		<Stack gap="sm">
			<ShoutoutEditor event={event} />
			{shoutouts.length ? (
				shoutouts.map((entry) => <FeedbackCard key={entry.id} entry={entry} />)
			) : (
				<EmptyState
					title="No shoutouts yet"
					description="Be the first to recognize someone from this session."
				/>
			)}
		</Stack>
	);
};
