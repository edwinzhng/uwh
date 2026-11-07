import type { AppData, Member } from "./app-types";
import { availableAttendanceEvent } from "./attendance-metrics";
import { effectiveAttendance } from "./effective-attendance";
import { clubTimestamp } from "./event-time";
import { defaultSeasonId } from "./seasons";

export const formatPoolTime = (minutes: number): string => {
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

export const homeAttendance = (
	data: AppData,
	member: Member,
	seasonId: string,
	now: number,
): { practices: number; minutes: number } => {
	const responses = new Map(
		data.responses
			.filter((response) => response.personId === member.id)
			.map((response) => [response.eventId, response]),
	);
	return data.events
		.filter(
			(event) =>
				(event.kind === "training" ||
					event.kind === "hockey" ||
					event.kind === "program") &&
				(event.seasonId ?? defaultSeasonId) === seasonId &&
				availableAttendanceEvent(member, event, now),
		)
		.reduce(
			(total, event) => {
				const response = responses.get(event.id);
				const intervals = event.parts?.length
					? event.parts
					: [{ start: event.start, end: event.end, id: undefined }];
				const attended = intervals.filter((part) => {
					const attendance = effectiveAttendance(event, response, part.id, now);
					return attendance === "present" || attendance === "late";
				});
				const minutes = attended.reduce(
					(sum, part) =>
						sum +
						Math.max(
							0,
							(clubTimestamp(
								event.endDate ?? event.date,
								part.end,
								event.timeZone,
							) -
								clubTimestamp(event.date, part.start, event.timeZone)) /
								60000,
						),
					0,
				);
				return {
					practices: total.practices + (attended.length ? 1 : 0),
					minutes: total.minutes + minutes,
				};
			},
			{ practices: 0, minutes: 0 },
		);
};
