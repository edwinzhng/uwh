import type {
	ClubEvent,
	EventDraft,
	EventPart,
	EventResponse,
} from "./app-types";
import type { Attendance } from "./club";

export const selectedParts = (
	event: Pick<ClubEvent, "parts">,
	response: Pick<EventResponse, "partIds">,
): EventPart[] =>
	(event.parts ?? []).filter(
		(part) => !response.partIds || response.partIds.includes(part.id),
	);

export const participatesInPart = (
	response: Pick<EventResponse, "partIds">,
	partId?: string,
): boolean => !partId || !response.partIds || response.partIds.includes(partId);

export const attendanceForPart = (
	response: EventResponse,
	partId?: string,
): Attendance =>
	partId
		? (response.partAttendance?.find((entry) => entry.partId === partId)
				?.attendance ??
			(response.partAttendance ? "unmarked" : response.attendance))
		: response.attendance;

export const aggregateAttendance = (
	event: ClubEvent,
	response: EventResponse,
): Attendance => {
	if (!event.parts?.length || !response.partAttendance)
		return response.attendance;
	const values = selectedParts(event, response).map((part) =>
		attendanceForPart(response, part.id),
	);
	if (!values.length || values.includes("unmarked")) return "unmarked";
	if (values.includes("late")) return "late";
	return values.includes("present") ? "present" : "absent";
};

export const validatePartSelection = (
	event: ClubEvent,
	ids?: string[],
): void => {
	if (
		ids &&
		(!ids.length ||
			new Set(ids).size !== ids.length ||
			ids.some((id) => !event.parts?.some((part) => part.id === id)))
	)
		throw new Error("Choose valid practice parts.");
};

export const validatePracticeParts = (
	draft: EventDraft,
): string | undefined => {
	if (!draft.parts) return undefined;
	const parts = draft.parts;
	if (
		draft.kind === "social" ||
		parts.length < 1 ||
		parts.length > 12 ||
		new Set(parts.map((part) => part.id)).size !== parts.length ||
		new Set(parts.map((part) => part.title.trim().toLowerCase())).size !==
			parts.length
	)
		return "Use 1–12 distinctly named practice sections.";
	if (
		parts.some(
			(part) =>
				!/^[a-zA-Z0-9_-]{1,40}$/.test(part.id) ||
				!part.title.trim() ||
				part.title.length > 60 ||
				![part.start, part.end].every((time) =>
					/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
				) ||
				part.end <= part.start,
		)
	)
		return "Check each part’s name and times.";
	if (
		parts.at(0)?.start !== draft.start ||
		parts.at(-1)?.end !== draft.end ||
		parts.some(
			(part, index) =>
				index > 0 && (parts.at(index - 1)?.end ?? "") > part.start,
		)
	)
		return "Parts must fit the practice times without overlapping.";
	return undefined;
};

export const practicePartKey = (eventId: string, partId?: string): string =>
	partId ? JSON.stringify([eventId, partId]) : eventId;
