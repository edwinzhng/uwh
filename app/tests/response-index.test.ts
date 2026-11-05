import { expect, test } from "bun:test";
import type { EventResponse } from "../src/domain/app-types";
import { indexedEventResponse } from "../src/domain/response-index";

test("indexed responses preserve first-match behavior, isolate events and refresh on immutable writes", (): void => {
	const responses: EventResponse[] = Array.from(
		{ length: 10000 },
		(_, index) => ({
			eventId: `event-${Math.floor(index / 100)}`,
			personId: `person-${index % 100}`,
			response: "going",
			attendance: "unmarked",
		}),
	);
	for (const row of responses)
		expect(indexedEventResponse(responses, row.eventId, row.personId)).toBe(
			row,
		);
	const first = responses.at(0);
	if (!first) throw new Error("Missing fixture");
	const updated: EventResponse = { ...first, attendance: "absent" };
	expect(
		indexedEventResponse(
			[...responses, updated],
			first.eventId,
			first.personId,
		),
	).toBe(first);
	expect(
		indexedEventResponse(
			[updated, ...responses.slice(1)],
			first.eventId,
			first.personId,
		),
	).toBe(updated);
	expect(
		indexedEventResponse(responses, "missing", first.personId),
	).toBeUndefined();
	expect(
		indexedEventResponse(responses, first.eventId, "missing"),
	).toBeUndefined();
});
