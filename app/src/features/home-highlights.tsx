import { usePaginatedQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import {
	useLiveSessionPerformance,
	usePreviewSessionPerformance,
} from "../backend/use-session-performance";
import { useActivePerson, useApp } from "../demo/app-state";
import { Grid } from "../design-system";
import type { CoachingFeedback } from "../domain/app-types";
import { homeCoachNotes, homeFeedbackHighlight } from "../domain/home-feedback";
import type { SessionPerformanceEntry } from "../domain/session-performance";
import { type ClubShoutout, clubShoutoutPreview } from "../domain/shoutouts";
import { HomeFeedback } from "./home-feedback";
import { HomeShoutout } from "./home-shoutout";

const Highlights = ({
	personId,
	notes,
	ratings,
	latest,
}: {
	personId: string;
	notes: CoachingFeedback[];
	ratings: SessionPerformanceEntry[];
	latest?: ClubShoutout;
}): ReactElement | undefined => {
	const highlight = homeFeedbackHighlight(notes, ratings, personId);
	if (!latest)
		return highlight ? <HomeFeedback highlight={highlight} /> : undefined;
	if (!highlight) return <HomeShoutout latest={latest} />;
	return (
		<Grid gap="md">
			<HomeShoutout latest={latest} />
			<HomeFeedback highlight={highlight} />
		</Grid>
	);
};
const LiveHighlights = ({ personId }: { personId: string }): ReactElement => {
	const service = useLiveSessionPerformance(personId, "coach");
	const notes = usePaginatedQuery(
		api.pages.feedback,
		{ personId, visibility: "published", kind: "coaching" },
		{ initialNumItems: 1 },
	);
	const shoutouts = usePaginatedQuery(
		api.pages.shoutouts,
		{ personId },
		{ initialNumItems: 1 },
	);
	return (
		<Highlights
			personId={personId}
			notes={notes.results}
			ratings={service.entries}
			latest={shoutouts.results.at(0)}
		/>
	);
};
const PreviewHighlights = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const service = usePreviewSessionPerformance(personId, "coach");
	const { data, account } = useApp();
	return (
		<Highlights
			personId={personId}
			notes={homeCoachNotes(data.feedback, personId)}
			ratings={service.entries}
			latest={clubShoutoutPreview(
				data.feedback,
				data.members,
				account,
				personId,
			).at(0)}
		/>
	);
};
export const HomeHighlights = (): ReactElement => {
	const person = useActivePerson();
	return useApp().source === "convex" ? (
		<LiveHighlights key={person.id} personId={person.id} />
	) : (
		<PreviewHighlights key={person.id} personId={person.id} />
	);
};
