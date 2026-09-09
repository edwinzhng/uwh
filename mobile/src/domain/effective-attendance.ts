import type { ClubEvent, EventResponse } from "./app-types";
import type { Attendance } from "./club";
import {
	attendanceForPart,
	participatesInPart,
	selectedParts,
} from "./practice-parts";

export const effectiveAttendance = (
	event: ClubEvent,
	response?: EventResponse,
	partId?: string,
): Attendance => {
	if (!response || (partId && !participatesInPart(response, partId)))
		return "unmarked";
	const resolve = (part?: string): Attendance => {
		const marked = attendanceForPart(response, part);
		return marked === "unmarked" &&
			response.response === "going" &&
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
