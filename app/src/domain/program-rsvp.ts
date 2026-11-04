import type { ClubEvent, EventResponse, Member } from "./app-types";
import { addDays } from "./calendar-dates";
import { canRegister } from "./event-eligibility";
import { clubTimestamp, signupState } from "./event-time";
export type ProgramRsvp = {
	openRule?: "before-event" | "weekly";
	openWeekday?: number;
	openDays: number;
	openTime: string;
	closeDays: number;
	closeTime: string;
	reminderDays: number;
	defaultResponse: "none" | "going" | "unavailable";
};
export const defaultProgramRsvp = (): ProgramRsvp => ({
	openDays: 0,
	openTime: "12:00",
	closeDays: 0,
	closeTime: "18:00",
	reminderDays: 1,
	defaultResponse: "none",
});
export const validateProgramRsvp = (rsvp: ProgramRsvp): string | undefined => {
	if (
		rsvp.openRule === "weekly" &&
		(!Number.isInteger(rsvp.openWeekday) ||
			(rsvp.openWeekday ?? 0) < 1 ||
			(rsvp.openWeekday ?? 0) > 7)
	)
		return "Choose a registration opening weekday.";
	if (rsvp.openRule === "weekly" && rsvp.openDays <= rsvp.closeDays + 7)
		return "Use a weekly window at least 8 days longer than the closing offset.";
	if (
		![rsvp.openDays, rsvp.closeDays, rsvp.reminderDays].every(
			(days) => Number.isInteger(days) && days >= 0 && days <= 365,
		)
	)
		return "RSVP day offsets must be 0–365.";
	if (
		![rsvp.openTime, rsvp.closeTime].every((time) =>
			/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
		)
	)
		return "Choose valid RSVP times.";
	if (
		rsvp.openDays > 0 &&
		(rsvp.openDays < rsvp.closeDays ||
			(rsvp.openDays === rsvp.closeDays && rsvp.openTime >= rsvp.closeTime))
	)
		return "RSVP must open before it closes.";
	return undefined;
};
export const defaultProgramResponses = (
	event: ClubEvent,
	members: Member[],
	responses: EventResponse[],
	now: number,
): EventResponse[] => {
	const response = event.programRsvp?.defaultResponse;
	if (
		!response ||
		response === "none" ||
		event.cancelled ||
		event.closesAt === undefined ||
		event.closesAt > now
	)
		return responses;
	const candidates = members
		.filter(
			(member) =>
				canRegister(member, event) &&
				!responses.some(
					(entry) =>
						entry.personId === member.id &&
						entry.eventId === event.id &&
						entry.response !== "unanswered",
				),
		)
		.slice()
		.sort(
			(left, right) =>
				left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
		);
	const going = responses.filter(
		(entry) => entry.eventId === event.id && entry.response === "going",
	).length;
	const defaults = candidates.map((member, index): EventResponse => {
		const previous = responses.find(
			(entry) => entry.eventId === event.id && entry.personId === member.id,
		);
		return {
			...previous,
			eventId: event.id,
			personId: member.id,
			response:
				response === "going" && going + index >= (event.capacity ?? Infinity)
					? "waiting"
					: response,
			attendance: previous?.attendance ?? "unmarked",
		};
	});
	return [
		...responses.filter(
			(entry) =>
				!defaults.some(
					(added) =>
						added.eventId === entry.eventId &&
						added.personId === entry.personId,
				),
		),
		...defaults,
	];
};
export const applyProgramWindow = (
	event: ClubEvent,
	program: { rsvp: ProgramRsvp },
	now: number,
): ClubEvent => {
	const earliestDate = addDays(event.date, 1 - program.rsvp.openDays);
	const weekday = new Date(`${earliestDate}T12:00:00Z`).getUTCDay() || 7;
	const openingDate = addDays(
		earliestDate,
		((program.rsvp.openWeekday ?? 7) - weekday + 7) % 7,
	);
	const opensAt =
		program.rsvp.openRule === "weekly"
			? clubTimestamp(openingDate, program.rsvp.openTime, event.timeZone)
			: program.rsvp.openDays > 0
				? clubTimestamp(
						addDays(event.date, -program.rsvp.openDays),
						program.rsvp.openTime,
						event.timeZone,
					)
				: now;
	const closesAt = Math.min(
		clubTimestamp(
			addDays(event.date, -program.rsvp.closeDays),
			program.rsvp.closeTime,
			event.timeZone,
		),
		clubTimestamp(event.date, event.start, event.timeZone),
	);
	const next = { ...event, opensAt, closesAt };
	return { ...next, programRsvp: program.rsvp, signup: signupState(next, now) };
};
