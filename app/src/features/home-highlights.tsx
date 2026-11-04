import { usePaginatedQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useActivePerson, useApp } from "../demo/app-state";
import { Grid } from "../design-system";
import type { CoachingFeedback } from "../domain/app-types";
import { homeCoachNotes, homeFeedbackHighlight } from "../domain/home-feedback";
import { type ClubShoutout, clubShoutoutPreview } from "../domain/shoutouts";
import { HomeFeedback } from "./home-feedback";
import { HomeShoutout } from "./home-shoutout";

const Highlights = ({
	personId,
	notes,
	latest,
}: {
	personId: string;
	notes: CoachingFeedback[];
	latest?: ClubShoutout;
}): ReactElement | undefined => {
	const highlight = homeFeedbackHighlight(notes, personId);
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
			latest={shoutouts.results.at(0)}
		/>
	);
};
const PreviewHighlights = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const { data, account } = useApp();
	return (
		<Highlights
			personId={personId}
			notes={homeCoachNotes(data.feedback, personId)}
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
