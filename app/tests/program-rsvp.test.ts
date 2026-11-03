import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import {
	defaultProgramResponses,
	defaultProgramRsvp,
} from "../src/domain/program-rsvp";

const member = initialAppData.members.find(
	(entry) => entry.programs.includes("club") && !entry.archived,
);
if (!member) throw new Error("Player fixture unavailable");
const event: ClubEvent = {
	id: "default-rsvp",
	title: "Practice",
	program: "club",
	kind: "hockey",
	date: "2026-10-25",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	description: "",
	cancelled: false,
	signup: "closed",
	closesAt: 100,
	programRsvp: { ...defaultProgramRsvp(), defaultResponse: "going" },
};

test("RSVP deadline defaults preserve an unanswered player's marked attendance and response metadata", (): void => {
	const before: EventResponse = {
		eventId: event.id,
		personId: member.id,
		response: "unanswered",
		attendance: "present",
		partIds: ["hockey"],
		partAttendance: [
			{ partId: "hockey", attendance: "present" },
			{ partId: "training", attendance: "absent" },
		],
		absenceReason: "Retained attendance note",
		seriesExpected: true,
		seriesInvitedAt: 42,
	};
	const next = defaultProgramResponses(event, [member], [before], 100);
	expect(next).toEqual([{ ...before, response: "going" }]);
	expect(before.response).toBe("unanswered");
	expect(defaultProgramResponses(event, [member], next, 100)).toEqual(next);
});

test("waitlisted and unavailable defaults retain existing marks; new defaults initialize only missing attendance", (): void => {
	const before: EventResponse = {
		eventId: event.id,
		personId: member.id,
		response: "unanswered",
		attendance: "absent",
		absenceReason: "Coach marked before the scheduled job",
	};
	expect(
		defaultProgramResponses({ ...event, capacity: 0 }, [member], [before], 100),
	).toEqual([{ ...before, response: "waiting" }]);
	expect(
		defaultProgramResponses(
			{
				...event,
				programRsvp: {
					...defaultProgramRsvp(),
					defaultResponse: "unavailable",
				},
			},
			[member],
			[before],
			100,
		),
	).toEqual([{ ...before, response: "unavailable" }]);
	expect(defaultProgramResponses(event, [member], [], 100)).toEqual([
		{
			eventId: event.id,
			personId: member.id,
			response: "going",
			attendance: "unmarked",
		},
	]);
});
