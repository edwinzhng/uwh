import type { ClubEvent } from "../src/domain/app-types";
import type { InboxSource } from "../src/domain/inbox";
import { eventFinished } from "../src/domain/schedule-agenda";

const eventAudience = (event: ClubEvent): string =>
	JSON.stringify([
		event.program,
		Boolean(event.programRsvp),
		event.eligiblePersonIds?.toSorted(),
	]);

export const createdNotificationEvents = (
	previous: readonly ClubEvent[],
	next: readonly ClubEvent[],
	now: number,
): ClubEvent[] => {
	const candidates = next.filter(
		(event) =>
			!event.cancelled &&
			!eventFinished(event, now) &&
			!previous.some((entry) => entry.id === event.id),
	);
	return [...new Set(candidates.map(eventAudience))].flatMap(
		(audience) =>
			candidates.find((event) => eventAudience(event) === audience) ?? [],
	);
};

export const requiresSessionReminders = (
	source: Pick<InboxSource, "kind" | "topic" | "eventPhase">,
): boolean =>
	source.kind === "events" &&
	(!source.topic || source.topic === "event") &&
	(!source.eventPhase ||
		source.eventPhase === "open" ||
		source.eventPhase === "closing");

export const changedNotificationEvent = (
	before: ClubEvent,
	event: ClubEvent,
): boolean =>
	!before.cancelled &&
	(event.cancelled ||
		event.date !== before.date ||
		event.endDate !== before.endDate ||
		event.timeZone !== before.timeZone ||
		event.start !== before.start ||
		event.end !== before.end ||
		event.title !== before.title ||
		event.venue !== before.venue ||
		JSON.stringify(event.parts ?? []) !== JSON.stringify(before.parts ?? []));
