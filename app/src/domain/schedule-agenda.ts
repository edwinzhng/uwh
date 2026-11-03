import type { ClubEvent, EventResponse } from "./app-types";
import { clubTimestamp } from "./event-time";

export const eventFinished = (event: ClubEvent, now: number): boolean =>
	clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <= now;
export const agendaEvents = (
	events: readonly ClubEvent[],
	now: number,
	programId?: string,
): { past?: ClubEvent; upcoming: ClubEvent[] } => {
	const ordered = events
		.filter((event) => !programId || event.program === programId)
		.slice()
		.sort(
			(left, right) =>
				clubTimestamp(left.date, left.start, left.timeZone) -
					clubTimestamp(right.date, right.start, right.timeZone) ||
				left.id.localeCompare(right.id),
		);
	return {
		past: ordered.filter((event) => eventFinished(event, now)).at(-1),
		upcoming: ordered.filter((event) => !eventFinished(event, now)),
	};
};
export const partResponse = (
	response: EventResponse,
	partId: string,
): EventResponse["response"] => {
	if (response.declinedPartIds !== undefined) {
		if (response.declinedPartIds.includes(partId)) return "unavailable";
		return (response.response === "going" || response.response === "waiting") &&
			(!response.partIds || response.partIds.includes(partId))
			? response.response
			: "unanswered";
	}
	return response.response === "going" &&
		response.partIds &&
		!response.partIds.includes(partId)
		? "unavailable"
		: response.response;
};
export const changedPartResponse = (
	event: ClubEvent,
	current: EventResponse,
	partId: string,
	going: boolean,
): {
	response: "going" | "unavailable" | "unanswered";
	partIds?: string[];
	declinedPartIds: string[];
} => {
	if (!event.parts?.some((part) => part.id === partId))
		throw new Error("Choose a practice section.");
	const choices = event.parts.map((part) => ({
		id: part.id,
		response:
			part.id === partId
				? going
					? "going"
					: "unavailable"
				: partResponse(current, part.id),
	}));
	const selected = choices
		.filter((part) => part.response === "going" || part.response === "waiting")
		.map((part) => part.id);
	const declinedPartIds = choices
		.filter((part) => part.response === "unavailable")
		.map((part) => part.id);
	return {
		response: selected.length
			? "going"
			: declinedPartIds.length === event.parts.length
				? "unavailable"
				: "unanswered",
		partIds:
			selected.length && selected.length !== event.parts.length
				? selected
				: undefined,
		declinedPartIds,
	};
};
export const validatePartResponses = (
	event: ClubEvent,
	response: string,
	partIds?: string[],
	declinedPartIds?: string[],
): void => {
	if (declinedPartIds === undefined) return;
	const parts = event.parts ?? [];
	if (
		!parts.length ||
		new Set(declinedPartIds).size !== declinedPartIds.length ||
		declinedPartIds.some((id) => !parts.some((part) => part.id === id))
	)
		throw new Error("Choose valid practice sections.");
	const selected =
		response === "going" ? (partIds ?? parts.map((part) => part.id)) : [];
	if (
		declinedPartIds.some((id) => selected.includes(id)) ||
		(response === "unavailable" && declinedPartIds.length !== parts.length) ||
		(response === "unanswered" &&
			(!declinedPartIds.length || declinedPartIds.length === parts.length))
	)
		throw new Error("Check each section’s response.");
};
