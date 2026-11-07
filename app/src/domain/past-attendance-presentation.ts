import type { ClubEvent, EventResponse } from "./app-types";
import { attendanceForPart, participatesInPart } from "./practice-parts";

type Status = { label: string; tone: "success" | "danger" | "neutral" };

const pastPartStatus = (response: EventResponse, partId?: string): Status => {
	if (partId && !participatesInPart(response, partId))
		return response.response === "unavailable"
			? { label: "RSVP: No", tone: "danger" }
			: { label: "Not selected", tone: "neutral" };
	const mark = attendanceForPart(response, partId);
	if (mark === "present") return { label: "Attended", tone: "success" };
	if (mark === "late") return { label: "Attended late", tone: "success" };
	if (mark === "absent") return { label: "Absent", tone: "danger" };
	if (response.response === "going")
		return { label: "RSVP: Yes", tone: "success" };
	if (response.response === "unavailable")
		return { label: "RSVP: No", tone: "danger" };
	if (response.response === "waiting")
		return { label: "Waitlisted", tone: "neutral" };
	return { label: "No response", tone: "neutral" };
};

export const pastAttendancePresentation = (
	event: ClubEvent,
	response: EventResponse,
): { labels: string[]; tone: Status["tone"] } => {
	const parts = event.parts?.length
		? event.parts.map((part) => ({
				name: part.title,
				...pastPartStatus(response, part.id),
			}))
		: [];
	if (!parts.length) {
		const status = pastPartStatus(response);
		return { labels: [status.label], tone: status.tone };
	}
	const first = parts.at(0);
	if (first && parts.every((part) => part.label === first.label))
		return { labels: [first.label], tone: first.tone };
	return {
		labels: parts.map((part) => `${part.name}: ${part.label}`),
		tone: "neutral",
	};
};
