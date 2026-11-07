import type { ClubEvent, EventResponse } from "./app-types";
import type { Attendance } from "./club";
import { clubTimestamp, signupState } from "./event-time";
import { practiceEvent } from "./event-types";
import {
	attendanceForPart,
	participatesInPart,
	selectedParts,
} from "./practice-parts";
import { partResponse } from "./schedule-agenda";

export const practiceRsvp = (
	response?: EventResponse,
	partId?: string,
): EventResponse["response"] => {
	if (!response) return "unanswered";
	if (!partId || response.response === "unavailable") return response.response;
	if (!participatesInPart(response, partId) && !response.declinedPartIds)
		return "unavailable";
	return partResponse(response, partId);
};

export const unansweredPracticeAbsent = (
	event: ClubEvent,
	now: number,
	response?: EventResponse,
	partId?: string,
): boolean =>
	practiceEvent(event) &&
	!event.cancelled &&
	signupState(event, now) === "closed" &&
	now >= clubTimestamp(event.date, event.start, event.timeZone) &&
	practiceRsvp(response, partId) === "unanswered" &&
	(!response || attendanceForPart(response, partId) === "unmarked");

export const effectiveAttendance = (
	event: ClubEvent,
	response?: EventResponse,
	partId?: string,
	now = Date.now(),
): Attendance => {
	if (
		(partId || !event.parts?.length || !response?.partAttendance) &&
		unansweredPracticeAbsent(event, now, response, partId)
	)
		return "absent";
	if (!response || (partId && !participatesInPart(response, partId)))
		return "unmarked";
	const resolve = (part?: string): Attendance => {
		if (unansweredPracticeAbsent(event, now, response, part)) return "absent";
		const marked = attendanceForPart(response, part);
		return marked === "unmarked" &&
			practiceRsvp(response, part) === "going" &&
			!event.cancelled
			? "present"
			: marked;
	};
	if (partId || !event.parts?.length || !response.partAttendance)
		return resolve(partId);
	const marks = selectedParts(event, response).map((part) => resolve(part.id));
	if (!marks.length || marks.includes("unmarked")) return "unmarked";
	if (marks.includes("late")) return "late";
	return marks.includes("present") ? "present" : "absent";
};
