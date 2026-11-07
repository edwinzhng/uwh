export const nextFitnessLogPerson = (
	people: readonly { id: string }[],
	currentId: string,
): string | undefined => {
	const index = people.findIndex((person) => person.id === currentId);
	return index < 0 ? undefined : people.at(index + 1)?.id;
};

export const fitnessQuickLogSaveLabel = (
	nextPersonId: string | undefined,
): string => (nextPersonId ? "Save & next" : "Save result");

import type { ClubEvent, EventResponse } from "./app-types";
import { attendanceForPart, selectedParts } from "./practice-parts";

export const markedHereForFitness = (
	event: ClubEvent,
	response?: EventResponse,
): boolean =>
	Boolean(
		response &&
			(event.parts?.length && response.partAttendance
				? selectedParts(event, response).some(
						(part) => attendanceForPart(response, part.id) === "present",
					)
				: response.attendance === "present"),
	);
