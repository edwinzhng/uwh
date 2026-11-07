import { expect, test } from "bun:test";
import type { EventResponse } from "../src/domain/app-types";
import {
	eventResponsePresentation,
	scheduleCardTone,
} from "../src/domain/event-response-presentation";

const response = (value: EventResponse["response"]): EventResponse => ({
	eventId: "practice",
	personId: "sam",
	response: value,
	attendance: "unmarked",
});

test("schedule cards reflect responses without marking unopened or unanswered sessions as warnings", (): void => {
	expect(
		scheduleCardTone({ response: "going", signup: "open", muted: false }),
	).toBe("success");
	expect(
		scheduleCardTone({ response: "unavailable", signup: "open", muted: false }),
	).toBe("danger");
	expect(
		scheduleCardTone({ response: "unanswered", signup: "open", muted: false }),
	).toBe("neutral");
	expect(
		scheduleCardTone({ response: "going", signup: "scheduled", muted: false }),
	).toBe("neutral");
	expect(
		scheduleCardTone({ response: "waiting", signup: "open", muted: false }),
	).toBe("warning");
	expect(
		scheduleCardTone({ response: "unavailable", signup: "open", muted: true }),
	).toBe("neutral");
});
test("event states have explicit labels and lineup only belongs to attending players", (): void => {
	expect(eventResponsePresentation(response("going"))).toEqual({
		label: "Attending",
		tone: "success",
		lineup: true,
	});
	expect(eventResponsePresentation(response("unavailable"))).toEqual({
		label: "Not attending",
		tone: "danger",
		lineup: false,
	});
	expect(eventResponsePresentation(response("unanswered"))).toEqual({
		label: "Response needed",
		tone: "warning",
		lineup: false,
	});
	expect(eventResponsePresentation(response("waiting"))).toEqual({
		label: "Waitlisted",
		tone: "warning",
		lineup: false,
	});
});
test("one selected block is partial attendance while all blocks count as attending", (): void => {
	expect(
		eventResponsePresentation(
			{ ...response("going"), partIds: ["training"] },
			2,
		).label,
	).toBe("Partly attending");
	expect(
		eventResponsePresentation(
			{ ...response("going"), declinedPartIds: ["hockey"] },
			2,
		).label,
	).toBe("Partly attending");
	expect(
		eventResponsePresentation(
			{ ...response("going"), partIds: ["training", "hockey"] },
			2,
		).label,
	).toBe("Attending");
	expect(eventResponsePresentation(response("going"), 2).label).toBe(
		"Attending",
	);
});
