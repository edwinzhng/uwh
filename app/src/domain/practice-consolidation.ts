import type { ClubEvent, EventResponse } from "./app-types";
import { aggregateAttendance } from "./practice-parts";

const practiceDays: Readonly<Record<number, string>> = {
	0: "Sunday",
	1: "Monday",
	4: "Thursday",
	5: "Friday",
};
export const practiceProgramId = (day: string): string | undefined => {
	const programs: Readonly<Record<string, string>> = {
		Sunday: "sunday-practice",
		Monday: "monday-training",
		Thursday: "thursday-practice",
		Friday: "friday-hockey",
	};
	return programs[day];
};
export const cleanPracticeTitle = (event: ClubEvent): string => {
	const day = practiceDays[new Date(`${event.date}T12:00:00Z`).getUTCDay()];
	return day &&
		["training", "hockey"].includes(event.kind) &&
		!/\bagm\b|meeting|tournament|competition|social|party/i.test(event.title)
		? `${day} Practice`
		: event.title;
};
export const cleanPracticeEvent = (event: ClubEvent): ClubEvent => {
	const standalone =
		event.kind === "tournament" ||
		event.kind === "meeting" ||
		/\bagm\b|tournament|competition/i.test(event.title);
	if (standalone)
		return {
			...event,
			program: "all",
			programRsvp: undefined,
			programRsvpManaged: undefined,
			kind: /\bagm\b/i.test(event.title) ? "meeting" : event.kind,
		};
	const day = new Date(`${event.date}T12:00:00Z`).getUTCDay();
	return {
		...event,
		title: cleanPracticeTitle(event),
		program: ["training", "hockey"].includes(event.kind)
			? (practiceProgramId(practiceDays[day] ?? "") ?? event.program)
			: event.program,
	};
};
export const unreliableHistoricalPractice = (event: ClubEvent): boolean =>
	event.date < "2026-11-05" &&
	(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.start) ||
		!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.end) ||
		(!event.endDate && event.start >= event.end));
export type PracticePair = { training: ClubEvent; hockey: ClubEvent };
export const practicePairs = (events: readonly ClubEvent[]): PracticePair[] => {
	const eligible = events.filter(
		(event) =>
			!event.parts?.length &&
			event.id.startsWith("sporteasy:") &&
			[0, 4].includes(new Date(`${event.date}T12:00:00Z`).getUTCDay()) &&
			["training", "hockey"].includes(event.kind) &&
			!/\bagm\b|meeting|tournament|competition|social|party/i.test(event.title),
	);
	return eligible
		.filter((event) => event.kind === "training")
		.flatMap((training) => {
			const candidates = eligible.filter(
				(event) =>
					event.date === training.date && event.venue === training.venue,
			);
			const hockey = candidates.find((event) => event.kind === "hockey");
			if (candidates.length !== 2 || !hockey) return [];
			if (
				training.cancelled !== hockey.cancelled ||
				training.end !== hockey.start ||
				training.start >= training.end ||
				hockey.start >= hockey.end
			)
				throw new Error(`Practice pair needs review: ${training.date}`);
			if (
				training.capacity !== hockey.capacity ||
				JSON.stringify(training.eligiblePersonIds) !==
					JSON.stringify(hockey.eligiblePersonIds)
			)
				throw new Error(`Practice eligibility differs: ${training.date}`);
			return [{ training, hockey }];
		});
};
export const combinePractice = ({
	training,
	hockey,
}: PracticePair): ClubEvent => ({
	...cleanPracticeEvent(training),
	title: cleanPracticeTitle(training),
	end: hockey.end,
	description: [
		...new Set([training.description, hockey.description].filter(Boolean)),
	].join("\n\n"),
	parts: [
		{
			id: "training",
			title: "Training",
			kind: "training",
			start: training.start,
			end: training.end,
		},
		{
			id: "hockey",
			title: "Hockey",
			kind: "hockey",
			start: hockey.start,
			end: hockey.end,
		},
	],
});
export const combinePracticeResponse = (
	event: ClubEvent,
	personId: string,
	training?: EventResponse,
	hockey?: EventResponse,
): EventResponse & { id: string } => {
	const entries = [
		{ id: "training", value: training },
		{ id: "hockey", value: hockey },
	];
	if (entries.some(({ value }) => value?.partIds || value?.partAttendance))
		throw new Error("Existing part attendance needs review before merging.");
	const going = entries.filter(({ value }) => value?.response === "going");
	const response = going.length
		? "going"
		: entries.some(({ value }) => value?.response === "waiting")
			? "waiting"
			: entries.some(({ value }) => value?.response === "unavailable")
				? "unavailable"
				: "unanswered";
	const merged: EventResponse & { id: string } = {
		id: `${event.id}:${personId}`,
		eventId: event.id,
		personId,
		response,
		attendance: "unmarked",
		partIds: going.length ? going.map(({ id }) => id) : undefined,
		declinedPartIds: entries
			.filter(({ value }) => value?.response === "unavailable")
			.map(({ id }) => id),
		partAttendance: entries.map(({ id, value }) => ({
			partId: id,
			attendance: value?.attendance ?? "unmarked",
		})),
		absenceReason:
			[
				...new Set(
					entries.map(({ value }) => value?.absenceReason).filter(Boolean),
				),
			].join("\n") || undefined,
		seriesExpected:
			training?.seriesExpected || hockey?.seriesExpected || undefined,
		seriesInvitedAt: training?.seriesInvitedAt ?? hockey?.seriesInvitedAt,
	};
	return { ...merged, attendance: aggregateAttendance(event, merged) };
};
