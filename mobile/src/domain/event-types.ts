import type { ClubEvent } from "./app-types";

export const eventTypeFilters = [
	{ value: "all", label: "All" },
	{ value: "practice", label: "Practices" },
	{ value: "tournament", label: "Tournaments" },
	{ value: "social", label: "Social" },
	{ value: "meeting", label: "Meetings" },
] as const;
export type EventTypeFilter = (typeof eventTypeFilters)[number]["value"];
export const eventKindsForFilter = (
	filter: EventTypeFilter,
): ClubEvent["kind"][] =>
	filter === "all"
		? ["training", "hockey", "tournament", "social", "meeting"]
		: filter === "practice"
			? ["training", "hockey"]
			: [filter];
export const matchesEventType = (
	event: Pick<ClubEvent, "kind">,
	filter: EventTypeFilter,
): boolean => eventKindsForFilter(filter).includes(event.kind);
export const practiceEvent = (event: Pick<ClubEvent, "kind">): boolean =>
	matchesEventType(event, "practice");
export const eventKindLabel = (kind: ClubEvent["kind"]): string =>
	kind === "tournament"
		? "Tournament"
		: kind === "meeting"
			? "Meeting"
			: kind === "social"
				? "Social"
				: "Practice";
