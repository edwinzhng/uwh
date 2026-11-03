import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type {
	ClubEvent,
	EventResponse,
	TeamPlan,
} from "../src/domain/app-types";
import {
	canCreateEventLineup,
	lineupParts,
	practiceLineupPart,
	publishedEventLineups,
} from "../src/domain/event-lineups";

const lineupsFor = (
	event: ClubEvent,
	plans: readonly TeamPlan[],
	personId: string,
	response: EventResponse = {
		eventId: event.id,
		personId,
		response: "going",
		attendance: "unmarked",
	},
): TeamPlan[] => publishedEventLineups(event, plans, personId, response);

const fixture = initialAppData.events.find((event) => event.id === "club-thu");
if (!fixture) throw new Error("Practice fixture missing.");
const event: ClubEvent = fixture;
const lineup: TeamPlan = {
	eventId: event.id,
	partId: "hockey",
	black: ["sam"],
	white: ["taylor"],
	attendees: ["sam", "taylor"],
	published: true,
};

test("multipart lineup creation offers hockey blocks and excludes training or all-parts scopes", (): void => {
	expect(lineupParts(event).map((part) => part.id)).toEqual(["hockey"]);
	expect(canCreateEventLineup(event, "hockey")).toBe(true);
	expect(canCreateEventLineup(event, "training")).toBe(false);
	expect(canCreateEventLineup(event)).toBe(false);
	expect(canCreateEventLineup(event, "missing")).toBe(false);
	expect(canCreateEventLineup({ ...event, cancelled: true }, "hockey")).toBe(
		false,
	);
	expect(
		canCreateEventLineup({ ...event, parts: undefined, kind: "hockey" }),
	).toBe(true);
	expect(
		canCreateEventLineup({ ...event, parts: undefined, kind: "training" }),
	).toBe(false);
});

test("schedule lineup visibility requires a relevant published player assignment", (): void => {
	expect(lineupsFor(event, [], "sam")).toEqual([]);
	expect(lineupsFor(event, [{ ...lineup, published: false }], "sam")).toEqual(
		[],
	);
	expect(lineupsFor(event, [lineup], "unassigned")).toEqual([]);
	expect(lineupsFor(event, [lineup], "sam")).toEqual([lineup]);
	expect(
		lineupsFor(event, [{ ...lineup, black: [], blackBench: ["sam"] }], "sam"),
	).toHaveLength(1);
	expect(lineupsFor({ ...event, cancelled: true }, [lineup], "sam")).toEqual(
		[],
	);
	expect(
		lineupsFor(event, [{ ...lineup, eventId: "different" }], "sam"),
	).toEqual([]);
});

test("published training or invalid part records stay intact but are excluded from player lineup tabs", (): void => {
	const training = { ...lineup, partId: "training" };
	const invalid = { ...lineup, partId: "missing" };
	const records = [training, invalid, lineup];
	expect(lineupsFor(event, records, "sam")).toEqual([lineup]);
	expect(records).toEqual([training, invalid, lineup]);
	expect(training.published).toBe(true);
	expect(training.partId).toBe("training");
});

test("a training-only response hides a stale published hockey assignment", (): void => {
	const response: EventResponse = {
		eventId: event.id,
		personId: "sam",
		response: "going",
		attendance: "unmarked",
		partIds: ["training"],
		declinedPartIds: ["hockey"],
	};
	expect(publishedEventLineups(event, [lineup], "sam", response)).toEqual([]);
	expect(
		publishedEventLineups(event, [lineup], "sam", {
			...response,
			partIds: ["training", "hockey"],
			declinedPartIds: [],
		}),
	).toEqual([lineup]);
	expect(
		publishedEventLineups(event, [lineup], "sam", {
			...response,
			partIds: ["training"],
			declinedPartIds: undefined,
		}),
	).toEqual([]);
});

test("whole-event Yes includes hockey, while No, waitlist, missing and mismatched responses do not", (): void => {
	const response: EventResponse = {
		eventId: event.id,
		personId: "sam",
		response: "going",
		attendance: "unmarked",
	};
	expect(publishedEventLineups(event, [lineup], "sam", response)).toEqual([
		lineup,
	]);
	for (const status of ["unavailable", "waiting", "unanswered"] as const)
		expect(
			publishedEventLineups(event, [lineup], "sam", {
				...response,
				response: status,
			}),
		).toEqual([]);
	expect(publishedEventLineups(event, [lineup], "sam", undefined)).toEqual([]);
	expect(
		publishedEventLineups(event, [lineup], "sam", {
			...response,
			personId: "taylor",
		}),
	).toEqual([]);
	expect(
		publishedEventLineups(event, [lineup], "sam", {
			...response,
			eventId: "other-event",
		}),
	).toEqual([]);
	const standalone = { ...event, parts: undefined, kind: "hockey" as const };
	const wholeLineup = { ...lineup, partId: undefined };
	expect(
		publishedEventLineups(standalone, [wholeLineup], "sam", response),
	).toEqual([wholeLineup]);
});

test("practice lineup scope automatically targets hockey without a block selector", (): void => {
	expect(practiceLineupPart(event, [])).toBe("hockey");
	expect(practiceLineupPart(event, [{ ...lineup, partId: "training" }])).toBe(
		"hockey",
	);
	const whole = { ...lineup, partId: undefined };
	expect(practiceLineupPart(event, [whole])).toBeUndefined();
	expect(practiceLineupPart(event, [whole, lineup])).toBe("hockey");
	expect(
		practiceLineupPart(event, [{ ...lineup, published: false }], true),
	).toBe("hockey");
	expect(
		practiceLineupPart({ ...event, parts: undefined }, []),
	).toBeUndefined();
});
