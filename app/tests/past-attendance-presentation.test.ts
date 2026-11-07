import { expect, test } from "bun:test";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import { pastAttendancePresentation } from "../src/domain/past-attendance-presentation";

const response: EventResponse = {
	eventId: "practice",
	personId: "player",
	response: "going",
	attendance: "unmarked",
};
const event: ClubEvent = {
	id: "practice",
	title: "Practice",
	date: "2026-09-01",
	start: "19:00",
	end: "20:30",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "closed",
	description: "",
	cancelled: false,
};

test("distinguishes recorded attendance from RSVP and no response", (): void => {
	expect(pastAttendancePresentation(event, response)).toEqual({
		labels: ["RSVP: Yes"],
		tone: "success",
	});
	expect(
		pastAttendancePresentation(event, { ...response, attendance: "present" }),
	).toEqual({ labels: ["Attended"], tone: "success" });
	expect(
		pastAttendancePresentation(event, { ...response, attendance: "absent" }),
	).toEqual({ labels: ["Absent"], tone: "danger" });
	expect(
		pastAttendancePresentation(event, { ...response, response: "unavailable" }),
	).toEqual({ labels: ["RSVP: No"], tone: "danger" });
	expect(
		pastAttendancePresentation(event, { ...response, response: "unanswered" }),
	).toEqual({ labels: ["No response"], tone: "neutral" });
});

test("shows distinct part statuses when attendance or selection differs", (): void => {
	const practice: ClubEvent = {
		...event,
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: "19:00",
				end: "19:45",
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: "19:45",
				end: "20:30",
			},
		],
	};
	expect(
		pastAttendancePresentation(practice, {
			...response,
			partAttendance: [
				{ partId: "training", attendance: "present" },
				{ partId: "hockey", attendance: "absent" },
			],
		}),
	).toEqual({
		labels: ["Training: Attended", "Hockey: Absent"],
		tone: "neutral",
	});
	expect(
		pastAttendancePresentation(practice, { ...response, partIds: ["hockey"] }),
	).toEqual({
		labels: ["Training: Not selected", "Hockey: RSVP: Yes"],
		tone: "neutral",
	});
});
