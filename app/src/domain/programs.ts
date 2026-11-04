import {
	applyProgramWindow,
	defaultProgramRsvp,
	type ProgramRsvp,
	validateProgramRsvp,
} from "./program-rsvp";

export {
	applyProgramWindow,
	defaultProgramResponses,
	defaultProgramRsvp,
	type ProgramRsvp,
	validateProgramRsvp,
} from "./program-rsvp";

import {
	addDays,
	createOccurrences,
	validateEvent,
	validDate,
} from "./app-rules";
import type { AppData, ClubEvent, EventDraft, Member } from "./app-types";
import { eligibleResponses } from "./event-recurrence";
import { clubDate, clubTimestamp } from "./event-time";

export type ProgramSchedule = {
	startDate: string;
	endDate: string;
	weekday: number;
	start: string;
	end: string;
	venue: string;
};
export type ClubProgram = {
	id: string;
	name: string;
	revision: number;
	archived: boolean;
	status: "draft" | "active" | "completed";
	kind: ClubEvent["kind"];
	seasonId?: string;
	schedule?: ProgramSchedule;
	rsvp: ProgramRsvp;
};
export type ProgramDraft = Omit<ClubProgram, "revision">;
export const programDraft = (program: ClubProgram): ProgramDraft => ({
	id: program.id,
	name: program.name,
	archived: program.archived,
	status: program.status,
	kind: program.kind,
	seasonId: program.seasonId,
	schedule: program.schedule
		? {
				startDate: program.schedule.startDate,
				endDate: program.schedule.endDate,
				weekday: program.schedule.weekday,
				start: program.schedule.start,
				end: program.schedule.end,
				venue: program.schedule.venue,
			}
		: undefined,
	rsvp: {
		openRule: program.rsvp.openRule,
		openWeekday: program.rsvp.openWeekday,
		openDays: program.rsvp.openDays,
		openTime: program.rsvp.openTime,
		closeDays: program.rsvp.closeDays,
		closeTime: program.rsvp.closeTime,
		reminderDays: program.rsvp.reminderDays,
		defaultResponse: program.rsvp.defaultResponse,
	},
});
export const defaultPrograms = (): ClubProgram[] => [
	{
		id: "club",
		name: "Club",
		revision: 0,
		archived: false,
		status: "active",
		kind: "hockey",
		rsvp: defaultProgramRsvp(),
	},
	{
		id: "youth",
		name: "Youth",
		revision: 0,
		archived: false,
		status: "active",
		kind: "training",
		rsvp: defaultProgramRsvp(),
	},
];
export const clubPrograms = (data: Pick<AppData, "programs">): ClubProgram[] =>
	data.programs ?? defaultPrograms();
export const programOptions = (
	data: Pick<AppData, "programs">,
): { value: string; label: string }[] =>
	clubPrograms(data)
		.filter((program) => !program.archived && program.status !== "completed")
		.map((program) => ({ value: program.id, label: program.name }));
export const programName = (
	data: Pick<AppData, "programs">,
	id: string,
): string =>
	id === "all"
		? "Everyone"
		: (clubPrograms(data).find((program) => program.id === id)?.name ??
			"Program");
export const programDates = (schedule: ProgramSchedule): string[] => {
	const count =
		Math.floor(
			(Date.parse(schedule.endDate) - Date.parse(schedule.startDate)) /
				86400000,
		) + 1;
	if (!Number.isFinite(count) || count < 1 || count > 366) return [];
	return Array.from({ length: count }, (_, index) =>
		addDays(schedule.startDate, index),
	).filter(
		(date) =>
			(new Date(`${date}T12:00:00Z`).getUTCDay() || 7) === schedule.weekday,
	);
};
export const validateProgram = (
	draft: ProgramDraft,
	data: Pick<AppData, "seasons" | "timeZone">,
): string | undefined => {
	const rsvpError = validateProgramRsvp(draft.rsvp);
	if (rsvpError) return rsvpError;
	if (!/^[a-zA-Z0-9_-]{1,100}$/.test(draft.id) || draft.id === "all")
		return "Choose a valid program ID.";
	if (!draft.name.trim()) return "Add a program name";
	if (draft.name.trim().length > 100)
		return "Keep the program name to 100 characters";
	if (
		draft.seasonId &&
		!data.seasons.some((season) => season.id === draft.seasonId)
	)
		return "Choose a season from this club.";
	if (!draft.schedule) return undefined;
	const schedule = draft.schedule;
	if (
		!validDate(schedule.startDate) ||
		!validDate(schedule.endDate) ||
		schedule.endDate < schedule.startDate ||
		!Number.isInteger(schedule.weekday) ||
		schedule.weekday < 1 ||
		schedule.weekday > 7
	)
		return "Check program dates and weekday";
	const dates = programDates(schedule);
	if (!dates.length || dates.length > 52) return "Choose 1–52 weekly sessions";
	const season = data.seasons.find((season) => season.id === draft.seasonId);
	if (
		season &&
		(schedule.startDate < season.start || schedule.endDate > season.end)
	)
		return "Keep dates within the selected season";
	const event = programEventDraft(
		draft,
		dates.at(0) ?? schedule.startDate,
		data.timeZone,
	);
	const error = validateEvent(event);
	if (error) return error;
	if (
		clubTimestamp(schedule.startDate, draft.rsvp.closeTime, data.timeZone) -
			draft.rsvp.closeDays * 86400000 >
		clubTimestamp(schedule.startDate, schedule.start, data.timeZone)
	)
		return "RSVP must close by the session start.";
	return undefined;
};
export const programEventDraft = (
	program: ProgramDraft,
	date: string,
	timeZone?: string,
): EventDraft => ({
	title: program.name,
	date,
	timeZone,
	start: program.schedule?.start ?? "19:00",
	end: program.schedule?.end ?? "20:30",
	venue: program.schedule?.venue ?? "",
	program: program.id,
	kind: program.kind,
	seasonId: program.seasonId,
	repeat: "once",
	description: "",
});
export const saveProgram = (
	data: AppData,
	draft: ProgramDraft,
	expectedRevision: number,
	memberIds: string[],
	now = Date.now(),
): AppData => {
	const error = validateProgram(draft, data);
	if (error) throw new Error(error);
	const current = clubPrograms(data).find((program) => program.id === draft.id);
	if (!Number.isInteger(expectedRevision) || expectedRevision < 0)
		throw new Error("Choose a valid program revision.");
	if (!current && clubPrograms(data).length >= 100)
		throw new Error("Archive or reuse an existing program before adding more.");
	if ((current?.revision ?? 0) !== expectedRevision)
		throw new Error("This program changed. Reload before saving.");
	if (
		new Set(memberIds).size !== memberIds.length ||
		memberIds.some(
			(id) =>
				!data.members.some((member) => member.id === id && !member.archived),
		)
	)
		throw new Error("Choose active members from this club.");
	if (
		clubPrograms(data).some(
			(program) =>
				program.id !== draft.id &&
				program.name.toLowerCase() === draft.name.trim().toLowerCase(),
		)
	)
		throw new Error("A program with that name already exists.");
	const program = {
		...draft,
		name: draft.name.trim(),
		revision: expectedRevision + 1,
	};
	const dates =
		draft.schedule && draft.status === "active" && !draft.archived
			? programDates(draft.schedule)
			: [];
	const today = clubDate(now, data.timeZone);
	const existingDates = new Set(
		data.events
			.filter((event) => event.program === draft.id)
			.map((event) => event.date),
	);
	const newEvents = dates
		.filter(
			(date) =>
				!existingDates.has(date) &&
				date >= today &&
				clubTimestamp(date, draft.schedule?.start ?? "00:00", data.timeZone) >
					now,
		)
		.map((date) => {
			const created = createOccurrences(
				`program-${draft.id}-${date}`,
				programEventDraft(draft, date, data.timeZone),
			).at(0);
			if (!created) throw new Error("Could not create the program session.");
			return applyProgramWindow(
				{ ...created, programManaged: true, seriesId: `program-${draft.id}` },
				program,
				now,
			);
		});
	const events = data.events.map((event) => {
		if (
			draft.archived ||
			event.program !== draft.id ||
			event.date < today ||
			clubTimestamp(event.date, event.start, event.timeZone) <= now ||
			event.cancelled
		)
			return event;
		if (event.programRsvpManaged)
			return applyProgramWindow(event, program, now);
		if (!event.programManaged || event.exception) return event;
		if (!dates.includes(event.date)) return { ...event, cancelled: true };
		return applyProgramWindow(
			{
				...event,
				title: program.name,
				venue: draft.schedule?.venue ?? event.venue,
				start: draft.schedule?.start ?? event.start,
				end: draft.schedule?.end ?? event.end,
				kind: draft.kind,
				seasonId: draft.seasonId,
			},
			program,
			now,
		);
	});
	const members = data.members.map(
		(member): Member =>
			member.archived
				? member
				: {
						...member,
						programs: memberIds.includes(member.id)
							? [...new Set([...member.programs, program.id])]
							: member.programs.filter((id) => id !== program.id),
					},
	);
	const futureEvents = events.filter(
		(event) =>
			event.program === program.id &&
			clubTimestamp(event.date, event.start, event.timeZone) > now,
	);
	const responses = eligibleResponses(
		{ ...data, members },
		events,
		futureEvents.map((event) => event.id),
	);
	const invalidated = new Set(
		futureEvents
			.filter((event) => {
				const previous = data.events.find((entry) => entry.id === event.id);
				return (
					previous?.kind !== event.kind ||
					previous?.cancelled !== event.cancelled ||
					JSON.stringify(
						data.responses.filter((entry) => entry.eventId === event.id),
					) !==
						JSON.stringify(
							responses.filter((entry) => entry.eventId === event.id),
						)
				);
			})
			.map((event) => event.id),
	);
	return {
		...data,
		programs: [
			...(current
				? clubPrograms(data).map((entry) =>
						entry.id === program.id ? program : entry,
					)
				: [...clubPrograms(data), program]),
		],
		members,
		responses,
		events: [...events, ...newEvents],
		teams: data.teams.map((team) =>
			invalidated.has(team.eventId)
				? { ...team, coachingStale: true, published: false }
				: team,
		),
	};
};
export const deleteProgram = (
	data: AppData,
	id: string,
	revision: number,
): AppData => {
	const program = clubPrograms(data).find((entry) => entry.id === id);
	if (!program || program.revision !== revision)
		throw new Error("This program changed. Reload before deleting.");
	if (
		data.events.some((event) => event.program === id) ||
		data.members.some((member) => member.programs.includes(id)) ||
		data.notices.some((notice) => notice.program === id) ||
		data.trackers.some((tracker) => tracker.program === id)
	)
		throw new Error(
			"This program has linked records. Archive it to preserve its history.",
		);
	return {
		...data,
		programs: clubPrograms(data).filter((entry) => entry.id !== id),
	};
};
