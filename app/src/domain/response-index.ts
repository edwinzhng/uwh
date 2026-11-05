import type { EventResponse } from "./app-types";

type Index = Map<string, Map<string, EventResponse>>;
const indexes = new WeakMap<readonly EventResponse[], Index>();
export const indexedEventResponse = (
	responses: readonly EventResponse[],
	eventId: string,
	personId: string,
): EventResponse | undefined => {
	const existing = indexes.get(responses);
	if (existing) return existing.get(eventId)?.get(personId);
	const index: Index = new Map();
	for (const response of responses) {
		const people =
			index.get(response.eventId) ?? new Map<string, EventResponse>();
		if (!people.has(response.personId)) people.set(response.personId, response);
		index.set(response.eventId, people);
	}
	indexes.set(responses, index);
	return index.get(eventId)?.get(personId);
};
