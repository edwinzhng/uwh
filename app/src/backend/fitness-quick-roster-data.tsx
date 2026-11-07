import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useApp } from "../demo/app-state";
import { previewFitnessAtom } from "../demo/fitness-state";
import type { ClubEvent } from "../domain/app-types";
import { markedHereForFitness } from "../domain/fitness-quick-log";

type QuickRoster = { presentIds: string[]; recordedIds: string[] };

type Props = {
	event?: ClubEvent;
	testId?: string;
	children: (roster?: QuickRoster) => ReactNode;
};

const LiveQuickRoster = ({ event, testId, children }: Props): ReactNode =>
	children(
		useQuery(
			api.fitness.quickLogRoster,
			event && testId
				? { eventId: event.id, testId: testId as Id<"fitnessTests"> }
				: "skip",
		),
	);

const PreviewQuickRoster = ({ event, testId, children }: Props): ReactNode => {
	const { data } = useApp();
	const preview = useAtomValue(previewFitnessAtom);
	if (!event || !testId) return children();
	const session = preview.sessions.find(
		(entry) =>
			entry.testId === testId &&
			entry.date === event.date &&
			(!entry.eventId || entry.eventId === event.id),
	);
	return children({
		presentIds: data.responses
			.filter(
				(response) =>
					response.eventId === event.id &&
					markedHereForFitness(event, response),
			)
			.map((response) => response.personId),
		recordedIds: session
			? preview.results
					.filter((result) => result.sessionId === session._id)
					.map((result) => result.personId)
			: [],
	});
};

export const FitnessQuickRosterData = ({
	event,
	testId,
	children,
}: Props): ReactNode =>
	useApp().source === "convex" ? (
		<LiveQuickRoster event={event} testId={testId}>
			{children}
		</LiveQuickRoster>
	) : (
		<PreviewQuickRoster event={event} testId={testId}>
			{children}
		</PreviewQuickRoster>
	);
