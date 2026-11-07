import type {
	ClubEvent,
	EventPart,
	EventResponse,
	TeamPlan,
} from "./app-types";
import { lineupIncludesPerson } from "./lineup";
import { partResponse } from "./schedule-agenda";

export const lineupParts = (event: Pick<ClubEvent, "parts">): EventPart[] =>
	(event.parts ?? []).filter((part) => part.kind !== "training");

export const practiceLineupPart = (
	event: ClubEvent,
	plans: readonly TeamPlan[],
	readOnly = false,
): string | undefined => {
	const existing = plans.filter(
		(plan) => plan.eventId === event.id && (!readOnly || plan.published),
	);
	const parts = lineupParts(event);
	const hockey = parts.filter((part) => part.kind === "hockey");
	const eligible = hockey.length ? hockey : parts;
	const savedPart = eligible.find((part) =>
		existing.some((plan) => plan.partId === part.id),
	)?.id;
	return (
		savedPart ??
		(existing.some((plan) => !plan.partId) ? undefined : eligible.at(0)?.id)
	);
};

export const canCreateEventLineup = (
	event: ClubEvent,
	partId?: string,
): boolean =>
	!event.cancelled &&
	(event.parts?.length
		? lineupParts(event).some((part) => part.id === partId)
		: !partId && (event.kind === "hockey" || event.kind === "program"));

export const publishedEventLineups = (
	event: ClubEvent,
	plans: readonly TeamPlan[],
	personId: string,
	response: EventResponse | undefined,
): TeamPlan[] =>
	event.cancelled ||
	!response ||
	response.eventId !== event.id ||
	response.personId !== personId ||
	response.response !== "going"
		? []
		: plans.filter(
				(plan) =>
					plan.eventId === event.id &&
					plan.published &&
					canCreateEventLineup(event, plan.partId) &&
					(!plan.partId || partResponse(response, plan.partId) === "going") &&
					lineupIncludesPerson(plan, personId),
			);
