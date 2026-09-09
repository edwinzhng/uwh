import { Temporal } from "@js-temporal/polyfill";
import type {
	AppData,
	ClubEvent,
	EventDraft,
	EventResponse,
} from "./app-types";
import { clubTimestamp, signupState, signupWindow } from "./event-time";

export const recurrenceChoices = [
	{ value: "once", label: "Does not repeat" },
	{ value: "daily", label: "Daily" },
	{ value: "weekdays", label: "Weekdays" },
	{ value: "weekly", label: "Weekly" },
	{ value: "fortnightly", label: "Every 2 weeks" },
	{ value: "monthly", label: "Monthly" },
] as const;

export const occurrenceDates = (draft: EventDraft): string[] => {
	const count = draft.repeat === "once" ? 1 : (draft.occurrences ?? 4);
	if (!Number.isInteger(count) || count < 1 || count > 52)
		throw new Error("Choose 1–52 occurrences.");
	const start = Temporal.PlainDate.from(draft.date);
	if (draft.repeat === "weekdays")
		return Array.from({ length: count * 2 + 2 }, (_, index) =>
			start.add({ days: index }),
		)
			.filter((date) => date.dayOfWeek <= 5)
			.slice(0, count)
			.map((date) => date.toString());
	return Array.from({ length: count }, (_, index) =>
		draft.repeat === "monthly"
			? start.add({ months: index }).toString()
			: start
					.add({
						days:
							index *
							(draft.repeat === "weekly"
								? 7
								: draft.repeat === "fortnightly"
									? 14
									: 1),
					})
					.toString(),
	);
};

export const editedOccurrences = (
	events: ClubEvent[],
	target: ClubEvent,
	draft: EventDraft,
	scope: "single" | "series" | "following",
	now: number,
	editId?: string,
): ClubEvent[] => {
	if (draft.rebuild || scope === "following")
		return rebuildOccurrences(events, target, draft, scope, now, editId);
	const shift = Temporal.PlainDate.from(target.date).until(
		Temporal.PlainDate.from(draft.date),
	).days;
	return events.map((event) => {
		if (
			event.cancelled ||
			(event.exception && event.id !== target.id) ||
			(event.id !== target.id &&
				!(
					scope === "series" &&
					target.seriesId &&
					event.seriesId === target.seriesId
				))
		)
			return event;
		const date = Temporal.PlainDate.from(event.date)
			.add({ days: shift })
			.toString();
		const previous = eventDraft(event);
		const offset =
			clubTimestamp(date, draft.start) - clubTimestamp(event.date, event.start);
		const window = signupWindow(date, draft, now);
		const opensAt =
			event.opensAt !== undefined &&
			(draft.signupOpens ?? "now") === previous.signupOpens
				? event.opensAt + (previous.signupOpens === "now" ? 0 : offset)
				: window.opensAt;
		const closesAt =
			event.closesAt !== undefined &&
			(draft.signupCloses ?? "start") === previous.signupCloses
				? event.closesAt + offset
				: window.closesAt;
		const changed: ClubEvent = {
			...event,
			public: draft.public ?? event.public ?? false,
			exception: scope === "single" && Boolean(event.seriesId),
			editId,
			seasonId: draft.seasonId ?? event.seasonId ?? "2026-2027",
			title: draft.title.trim(),
			date,
			start: draft.start,
			end: draft.end,
			venue: draft.venue.trim(),
			description: draft.description.trim(),
			kind: draft.kind,
			capacity: draft.capacity,
			eligiblePersonIds: draft.eligiblePersonIds,
			signupOpens: draft.signupOpens ?? "now",
			signupCloses: draft.signupCloses ?? "start",
			opensAt,
			closesAt,
		};
		return { ...changed, signup: signupState(changed, now) };
	});
};

export const eligibleResponses = (
	data: AppData,
	events: ClubEvent[],
	changedIds: string[],
): EventResponse[] => {
	return changedIds.reduce((responses, id) => {
		const event = events.find((entry) => entry.id === id);
		if (!event || event.cancelled) return responses;
		const eligible = (personId: string): boolean =>
			!event.eligiblePersonIds || event.eligiblePersonIds.includes(personId);
		const registered = responses.filter(
			(entry) =>
				entry.eventId === id &&
				entry.response === "going" &&
				eligible(entry.personId),
		);
		if (registered.length > event.capacity)
			throw new Error("Capacity can’t be below the number already going.");
		const promoted = responses
			.filter(
				(entry) =>
					entry.eventId === id &&
					entry.response === "waiting" &&
					eligible(entry.personId),
			)
			.slice(0, event.capacity - registered.length)
			.map((entry) => entry.personId);
		return responses.map((entry) =>
			entry.eventId !== id
				? entry
				: !eligible(entry.personId) &&
						(entry.response === "going" || entry.response === "waiting")
					? { ...entry, response: "unavailable" }
					: promoted.includes(entry.personId)
						? { ...entry, response: "going" }
						: entry,
		);
	}, data.responses);
};

export const eventDraft = (event: ClubEvent): EventDraft => ({
	public: event.public ?? false,
	seasonId: event.seasonId ?? "2026-2027",
	title: event.title,
	date: event.date,
	start: event.start,
	end: event.end,
	venue: event.venue,
	program: "club",
	kind: event.kind,
	capacity: event.capacity,
	description: event.description,
	repeat: event.repeat ?? (event.seriesId ? "weekly" : "once"),
	eligiblePersonIds: event.eligiblePersonIds,
	signupOpens:
		event.signupOpens ??
		(event.opensAt === clubTimestamp(event.date, event.start) - 168 * 3600000
			? "week"
			: event.opensAt === clubTimestamp(event.date, event.start) - 72 * 3600000
				? "three-days"
				: event.signup === "scheduled" && event.opensAt === undefined
					? "three-days"
					: "now"),
	signupCloses:
		event.signupCloses ??
		(event.closesAt === clubTimestamp(event.date, event.start) - 24 * 3600000
			? "day"
			: event.closesAt === clubTimestamp(event.date, event.start) - 3600000
				? "hour"
				: "start"),
});

export const seriesTargets = (
	events: ClubEvent[],
	target: ClubEvent,
	scope: "single" | "series" | "following",
): ClubEvent[] =>
	events
		.filter(
			(event) =>
				!event.cancelled &&
				(event.id === target.id ||
					(scope !== "single" &&
						target.seriesId &&
						event.seriesId === target.seriesId &&
						(scope !== "following" ||
							(event.seriesOrder !== undefined &&
							target.seriesOrder !== undefined
								? event.seriesOrder >= target.seriesOrder
								: `${event.date}T${event.start}` >=
									`${target.date}T${target.start}`)))),
		)
		.toSorted((a, b) =>
			a.seriesOrder !== undefined && b.seriesOrder !== undefined
				? a.seriesOrder - b.seriesOrder
				: `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`),
		);

const rebuildOccurrences = (
	events: ClubEvent[],
	target: ClubEvent,
	draft: EventDraft,
	scope: "single" | "series" | "following",
	now: number,
	editId?: string,
): ClubEvent[] => {
	const affected = seriesTargets(events, target, scope);
	const dates = occurrenceDates(draft);
	const revision = editId ?? String(now);
	const seriesId =
		scope === "following" || !target.seriesId
			? `${target.id}~${revision}`
			: target.seriesId;
	const replacements = dates.map((date, index): ClubEvent => {
		const previous = affected.at(index);
		if (previous?.exception && previous.id !== target.id)
			return {
				...previous,
				seriesId,
				editId,
				seriesOrder: index,
				seriesDate: date,
			};
		if (
			previous &&
			clubTimestamp(previous.date, previous.start) < now &&
			(date !== previous.date ||
				draft.start !== previous.start ||
				draft.end !== previous.end)
		)
			throw new Error(
				"Past events cannot be rescheduled. Choose this and following from a future event.",
			);
		const base = previous ?? {
			...target,
			id: `${seriesId}~${revision}-${index}`,
			date,
			opensAt: undefined,
			closesAt: undefined,
			exception: false,
		};
		const changed = editedOccurrences(
			[base],
			base,
			{ ...draft, date, rebuild: false },
			"single",
			now,
			editId,
		).at(0);
		if (!changed) throw new Error("Event unavailable.");
		return {
			...changed,
			seriesOrder: index,
			seriesDate: date,
			seriesId: dates.length > 1 || target.seriesId ? seriesId : undefined,
			exception: false,
			repeat: draft.repeat,
		};
	});
	const retired = affected.slice(dates.length).map((event): ClubEvent => {
		if (event.exception)
			throw new Error(
				"This series has individual edits. Cancel those events separately before shortening it.",
			);
		if (clubTimestamp(event.date, event.start) < now)
			throw new Error("Past events cannot be removed from a series.");
		return { ...event, cancelled: true, signup: "closed", editId };
	});
	const revised = new Map(
		[...replacements, ...retired].map((event) => [event.id, event]),
	);
	return [
		...events.map((event) => revised.get(event.id) ?? event),
		...replacements.filter(
			(event) => !events.some((original) => original.id === event.id),
		),
	];
};
