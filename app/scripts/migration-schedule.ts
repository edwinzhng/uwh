import { Temporal } from "@js-temporal/polyfill";
import type { Doc } from "../convex/_generated/dataModel";
import {
	cleanPracticeEvent,
	combinePractice,
	combinePracticeResponse,
	practicePairs,
	unreliableHistoricalPractice,
} from "../src/domain/practice-consolidation";
import {
	type SourceCalendarEvent,
	type SourceRow,
	seasonFor,
	sourceDate,
	sourceTime,
} from "./migration-source";

type EventValue = Doc<"events">["value"];
type ResponseValue = Doc<"responses">["value"];
type LegacyPractice = {
	_id: string;
	date: number;
	notes?: string;
	sporteasyId?: string | number;
};
type LegacyAttendance = {
	_id: string;
	practiceId: string;
	playerId: string;
	attended: boolean;
};
type Input = {
	tables: Record<string, SourceRow[]>;
	calendar: SourceCalendarEvent[];
	legacyPractices: LegacyPractice[];
	legacyAttendance: LegacyAttendance[];
	presence: Record<string, string>[];
	columns: { index: number; eventId: string }[];
	person: (source: "base44" | "legacy" | "sporteasyName", id: string) => string;
};
type EventEntry = { sourceId: string; value: EventValue };
type ResponseEntry = { sourceId: string; value: ResponseValue };
type MergedResponse = { value: ResponseValue; intentPriority: number };

const dateOnly = (value: string): string =>
	Temporal.PlainDate.from(sourceDate(value)).toString();
const monday = (date: string): boolean =>
	Temporal.PlainDate.from(date).dayOfWeek === 1;
const requiredTime = (value: string | undefined, sourceId: string): string => {
	if (!value || !/^\d{2}:\d{2}$/.test(value))
		throw new Error(`Missing source time: ${sourceId}`);
	Temporal.PlainTime.from(value);
	return value;
};
const sourceTimestamp = (value: string | undefined): number | undefined =>
	value?.trim()
		? /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
			? Temporal.Instant.from(value).epochMilliseconds
			: Temporal.PlainDateTime.from(value).toZonedDateTime("America/Edmonton")
					.epochMilliseconds
		: undefined;
const inferredKind = (text: string): EventValue["kind"] =>
	/meeting|\bagm\b/i.test(text)
		? "meeting"
		: /tournament|competition|potluck/i.test(text)
			? "tournament"
			: /party|social|fundraiser/i.test(text)
				? "social"
				: /training/i.test(text)
					? "training"
					: "hockey";

const sourceEvent = (
	row: SourceRow,
	programs: SourceRow[],
	kind: "Event" | "Session",
): EventValue => {
	const program = programs.find((entry) => entry.id === row.program_id);
	const date = dateOnly(row.date ?? "");
	const id = `base44:${kind}:${row.id}`;
	return {
		id,
		title:
			row.title ||
			(kind === "Session"
				? `${program?.name || "Monday practice"} · Session ${row.session_number}`
				: program?.name || "Monday practice"),
		date,
		start: requiredTime(row.time_start || program?.time_start, id),
		end: requiredTime(row.time_end || program?.time_end, id),
		venue: row.location || program?.location || "Venue not recorded",
		program: program ? `base44:${program.id}` : "club",
		kind: program?.type === "Training" ? "training" : "hockey",
		signup: kind === "Session" ? "closed" : "open",
		opensAt: sourceTimestamp(row.rsvp_open_at),
		closesAt: sourceTimestamp(row.rsvp_lock_at || row.rsvp_deadline),
		description: row.description || row.notes || "",
		cancelled: row.cancelled === "true",
		timeZone: "America/Edmonton",
		seasonId: seasonFor(date),
	};
};

const headerDate = (value: string): string => {
	const parts = value.split("/");
	if (parts.length !== 3) return dateOnly(value);
	const year = parts.at(2) ?? "";
	return dateOnly(
		`${year.length === 2 ? `20${year}` : year}-${(parts.at(0) ?? "").padStart(2, "0")}-${(parts.at(1) ?? "").padStart(2, "0")}`,
	);
};

export const buildMigrationSchedule = ({
	tables,
	calendar,
	legacyPractices,
	legacyAttendance,
	presence,
	columns,
	person,
}: Input): {
	events: EventEntry[];
	responses: ResponseEntry[];
	sourceEvents: Map<string, EventValue>;
	summary: Record<string, number>;
} => {
	const events = new Map<string, EventEntry>();
	const sourceEvents = new Map<string, EventValue>();
	const responses = new Map<string, MergedResponse>();
	const programs = tables.Program ?? [];
	const addEvent = (sourceId: string, value: EventValue): EventValue => {
		if (sourceEvents.has(sourceId))
			throw new Error(`Duplicate source event: ${sourceId}`);
		sourceEvents.set(sourceId, value);
		if (!events.has(value.id)) events.set(value.id, { sourceId, value });
		return value;
	};
	const mergeResponse = (
		event: EventValue,
		personId: string,
		intent: ResponseValue["response"],
		intentPriority: number,
		attendance?: ResponseValue["attendance"],
	): void => {
		if (!personId) throw new Error(`Unresolved person for ${event.id}`);
		const key = `${event.id}:${personId}`;
		const current = responses.get(key);
		responses.set(key, {
			intentPriority: Math.max(current?.intentPriority ?? 0, intentPriority),
			value: {
				id: key,
				eventId: event.id,
				personId,
				response:
					!current || intentPriority >= current.intentPriority
						? intent
						: current.value.response,
				attendance: attendance ?? current?.value.attendance ?? "unmarked",
			},
		});
	};
	for (const entry of calendar) addEvent(`sporteasy:${entry.uid}`, entry.value);
	for (const row of legacyPractices) {
		const sourceId = `legacy:${row._id}`;
		const exact =
			row.sporteasyId === undefined
				? undefined
				: sourceEvents.get(`sporteasy:${row.sporteasyId}`);
		if (exact) {
			addEvent(sourceId, exact);
			continue;
		}
		const date = sourceDate(row.date);
		const start = sourceTime(row.date);
		addEvent(sourceId, {
			id: sourceId,
			title: "Club practice",
			date,
			start,
			end: start,
			venue: "Venue not recorded",
			program: "club",
			kind: inferredKind(row.notes ?? ""),
			signup: "closed",
			description: [row.notes, "End time not recorded in the source."]
				.filter(Boolean)
				.join("\n\n"),
			cancelled: false,
			timeZone: "America/Edmonton",
			seasonId: seasonFor(date),
		});
	}
	const mondayEvents = (tables.Event ?? []).filter((row) =>
		monday(dateOnly(row.date ?? "")),
	);
	for (const row of mondayEvents) {
		const value = sourceEvent(row, programs, "Event");
		const candidates = calendar.filter(
			(entry) =>
				entry.value.date === value.date && entry.value.start === value.start,
		);
		addEvent(
			`base44:Event:${row.id}`,
			candidates.length === 1 ? (candidates.at(0)?.value ?? value) : value,
		);
	}
	for (const row of tables.Session ?? []) {
		const date = dateOnly(row.date ?? "");
		const candidates = [...events.values()].filter(
			(entry) =>
				entry.value.date === date &&
				monday(date) &&
				(entry.value.kind === "training" || entry.value.kind === "hockey"),
		);
		const match = candidates.length === 1 ? candidates.at(0)?.value : undefined;
		addEvent(
			`base44:Session:${row.id}`,
			match ?? sourceEvent(row, programs, "Session"),
		);
	}
	const mondayIds = new Set(mondayEvents.map((row) => row.id));
	const mondayRsvp = (tables.AttendanceRSVP ?? []).filter((row) =>
		mondayIds.has(row.event_id ?? ""),
	);
	for (const row of [...mondayRsvp].sort(
		(left, right) =>
			(left.updated_date ?? left.created_date ?? "").localeCompare(
				right.updated_date ?? right.created_date ?? "",
			) || (left.id ?? "").localeCompare(right.id ?? ""),
	)) {
		if (row.response !== "yes" && row.response !== "no") continue;
		const event = sourceEvents.get(`base44:Event:${row.event_id}`);
		if (!event) throw new Error(`Missing Monday RSVP event: ${row.event_id}`);
		mergeResponse(
			event,
			person("base44", row.player_id ?? ""),
			row.response === "yes" ? "going" : "unavailable",
			2,
		);
	}
	for (const row of legacyAttendance) {
		if (!row.attended) continue;
		const event = sourceEvents.get(`legacy:${row.practiceId}`);
		if (!event) continue;
		mergeResponse(event, person("legacy", row.playerId), "going", 1, "present");
	}
	const captured = columns
		.filter((column) => column.index >= 0 && column.index < 24)
		.sort((left, right) => left.index - right.index);
	if (
		new Set(captured.map((column) => column.index)).size !== captured.length ||
		new Set(captured.map((column) => column.eventId)).size !== captured.length
	)
		throw new Error("Duplicate captured presence column.");
	for (const column of captured) {
		if (!Number.isInteger(column.index))
			throw new Error("Invalid captured presence column.");
		const event = sourceEvents.get(`sporteasy:${column.eventId}`);
		if (!event)
			throw new Error(`Missing SportEasy presence event: ${column.eventId}`);
		const key = String.fromCharCode(66 + column.index);
		const date = presence.at(0)?.[key];
		if (date && headerDate(date) !== event.date)
			throw new Error(
				`Presence column date does not match exact UID: ${column.eventId}`,
			);
		for (const row of presence.slice(2)) {
			const status = row[key]?.trim();
			if (!status || !row.A?.trim()) continue;
			const personId = person("sporteasyName", row.A.trim());
			if (status === "On time")
				mergeResponse(event, personId, "going", 1, "present");
			else if (status === "Late")
				mergeResponse(event, personId, "going", 1, "late");
			else if (status === "Not excused")
				mergeResponse(event, personId, "going", 1, "absent");
			else if (status === "Excused")
				mergeResponse(event, personId, "unavailable", 3, "unmarked");
			else if (status === "Not selected")
				mergeResponse(event, personId, "unanswered", 0);
			else throw new Error(`Unknown SportEasy presence status: ${status}`);
		}
	}
	const pairs = practicePairs([...events.values()].map((entry) => entry.value));
	const canonical = (value: EventValue): EventValue => {
		const pair = pairs.find(
			(pair) => pair.training.id === value.id || pair.hockey.id === value.id,
		);
		return pair ? combinePractice(pair) : cleanPracticeEvent(value);
	};
	const normalizedEvents = [...events.values()]
		.filter((entry) => !unreliableHistoricalPractice(entry.value))
		.filter((entry) => !pairs.some((pair) => pair.hockey.id === entry.value.id))
		.map((entry) => ({ ...entry, value: canonical(entry.value) }));
	const normalizedResponses = [...responses]
		.map(([sourceId, entry]) => ({
			sourceId,
			value: entry.value,
		}))
		.filter(
			(entry) =>
				normalizedEvents.some(
					(event) => event.value.id === entry.value.eventId,
				) &&
				!pairs.some((pair) =>
					[pair.training.id, pair.hockey.id].includes(entry.value.eventId),
				),
		);
	for (const pair of pairs) {
		const event = combinePractice(pair);
		const rows = [...responses.values()]
			.map((entry) => entry.value)
			.filter((row) =>
				[pair.training.id, pair.hockey.id].includes(row.eventId),
			);
		for (const personId of new Set(rows.map((row) => row.personId))) {
			const value = combinePracticeResponse(
				event,
				personId,
				rows.find(
					(row) =>
						row.eventId === pair.training.id && row.personId === personId,
				),
				rows.find(
					(row) => row.eventId === pair.hockey.id && row.personId === personId,
				),
			);
			normalizedResponses.push({ sourceId: value.id, value });
		}
	}
	return {
		events: normalizedEvents,
		responses: normalizedResponses,
		sourceEvents: new Map(
			[...sourceEvents]
				.filter(([, value]) => !unreliableHistoricalPractice(value))
				.map(([id, value]) => [id, canonical(value)]),
		),
		summary: {
			sporteasyEvents: calendar.length,
			legacyPractices: legacyPractices.length,
			base44MondayEvents: mondayEvents.length,
			base44Sessions: (tables.Session ?? []).length,
			base44MondayRsvp: mondayRsvp.length,
			legacyPresentRows: legacyAttendance.filter((row) => row.attended).length,
			orphanLegacyAttendance: legacyAttendance.filter(
				(row) => row.attended && !sourceEvents.has(`legacy:${row.practiceId}`),
			).length,
			presenceColumns: captured.length,
			events: normalizedEvents.length,
			responses: normalizedResponses.length,
		},
	};
};
