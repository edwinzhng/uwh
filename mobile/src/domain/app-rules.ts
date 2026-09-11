import type {
	Account,
	AppData,
	ClubEvent,
	Conversation,
	EventDraft,
	EventResponse,
	Member,
	TeamPlan,
} from "./app-types";
import { occurrenceDates } from "./event-recurrence";
import { clubTimestamp, signupState, signupWindow } from "./event-time";
import {
	attendanceForPart,
	participatesInPart,
	validatePracticeParts,
} from "./practice-parts";
import { defaultSeasonId } from "./seasons";
import { defaultClubTimeZone, validTimeZone } from "./time-zones";

export const programs = [
	{ value: "club", label: "Club" },
	{ value: "youth", label: "Youth" },
] as const;
export const canManagePerson = (account: Account, personId: string): boolean =>
	account.personId === personId || account.children.includes(personId);
export const canCoach = (account: Account, _program?: string): boolean =>
	account.coachPrograms.length > 0;
export const canCoachMember = (account: Account, _member: Member): boolean =>
	canCoach(account);
export const canRegister = (member: Member, event: ClubEvent): boolean =>
	member.programs.length > 0 &&
	(!event.eligiblePersonIds || event.eligiblePersonIds.includes(member.id));
export const memberRoles = (member: Member, accounts: Account[]): string => {
	const account = accounts.find((entry) => entry.personId === member.id);
	return (
		[
			member.programs.length ? "Player" : undefined,
			account && canCoach(account) ? "Coach" : undefined,
			account?.admin ? "Admin" : undefined,
		]
			.filter(Boolean)
			.join(" · ") || (account?.children.length ? "Parent" : "Member")
	);
};
export const canReadProgress = (account: Account, member: Member): boolean =>
	canManagePerson(account, member.id) || canCoachMember(account, member);
export const canReadThread = (
	account: Account,
	thread: Conversation,
): boolean => thread.accountIds.includes(account.id);
export const programLabel = (id: string): string =>
	programs.find((program) => program.value === id)?.label ?? "Club";
export const memberName = (data: AppData, id: string): string =>
	data.members.find((member) => member.id === id)?.name ?? "Member";
export const eventResponse = (
	data: AppData,
	eventId: string,
	personId: string,
): EventResponse =>
	data.responses.find(
		(entry) => entry.eventId === eventId && entry.personId === personId,
	) ?? { eventId, personId, response: "unanswered", attendance: "unmarked" };
export const eventAttendees = (
	data: AppData,
	eventId: string,
	partId?: string,
): Member[] => {
	const attending = new Set(
		data.responses
			.filter(
				(entry) =>
					entry.eventId === eventId &&
					entry.response === "going" &&
					participatesInPart(entry, partId) &&
					attendanceForPart(entry, partId) !== "absent",
			)
			.map((entry) => entry.personId),
	);
	return data.members.filter((member) => attending.has(member.id));
};
export const lineupNeedsReview = (data: AppData, plan: TeamPlan): boolean =>
	Boolean(plan.coachingStale) ||
	eventAttendees(data, plan.eventId, plan.partId)
		.map((member) => member.id)
		.toSorted()
		.join(",") !== plan.attendees.toSorted().join(",");
export const balance = (data: AppData, personId: string): number =>
	data.charges
		.filter((entry) => entry.personId === personId)
		.reduce((total, entry) => total + entry.amount, 0) -
	(data.paymentTotals?.[personId] ??
		data.payments
			.filter((entry) => entry.personId === personId)
			.reduce((total, entry) => total + entry.amount, 0));
export const money = (cents: number): string =>
	new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: cents % 100 ? 2 : 0,
	}).format(cents / 100);
export const formatDate = (date: string): string =>
	new Intl.DateTimeFormat("en-CA", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${date}T12:00:00Z`));
export const formatTime = (time: string): string =>
	new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: "UTC",
	}).format(new Date(`2026-01-01T${time}:00Z`));
export const addDays = (date: string, days: number): string =>
	new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
		.toISOString()
		.slice(0, 10);
export const validDate = (date: string): boolean =>
	/^\d{4}-\d{2}-\d{2}$/.test(date) &&
	!Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
	new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
export const validateEvent = (draft: EventDraft): string | undefined => {
	if (!validTimeZone(draft.timeZone ?? defaultClubTimeZone))
		return "Choose a valid timezone.";
	const partsError = validatePracticeParts(draft);
	if (partsError) return partsError;
	if (draft.eligiblePersonIds && !draft.eligiblePersonIds.length)
		return "Choose at least one eligible player.";
	if (!draft.title.trim() || !draft.venue.trim())
		return "Add a title and venue.";
	if (!validDate(draft.date)) return "Choose a date.";
	if (
		![draft.start, draft.end].every((time) =>
			/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
		) ||
		draft.end <= draft.start
	)
		return "End time must be after the start.";
	if (
		draft.capacity !== undefined &&
		(!Number.isInteger(draft.capacity) ||
			draft.capacity < 1 ||
			draft.capacity > 200)
	)
		return "Capacity must be 1–200.";
	if (
		draft.registrationCloseHours !== undefined &&
		(!Number.isFinite(draft.registrationCloseHours) ||
			draft.registrationCloseHours < 0 ||
			draft.registrationCloseHours > 8760)
	)
		return "Choose closing hours between 0 and 8760.";
	if (
		draft.registrationOpen &&
		(!Number.isInteger(draft.registrationOpen.weeksBefore) ||
			draft.registrationOpen.weeksBefore < 0 ||
			draft.registrationOpen.weeksBefore > 52 ||
			!Number.isInteger(draft.registrationOpen.weekday) ||
			draft.registrationOpen.weekday < 1 ||
			draft.registrationOpen.weekday > 7)
	)
		return "Choose a valid registration opening day.";
	try {
		for (const date of occurrenceDates(draft)) {
			const window = signupWindow(date, draft, Date.now());
			if (draft.registrationOpen && window.opensAt >= window.closesAt)
				return "Registration must open before it closes.";
			for (const time of new Set([
				draft.start,
				draft.end,
				...(draft.parts ?? []).flatMap((part) => [part.start, part.end]),
			]))
				clubTimestamp(date, time, draft.timeZone);
		}
	} catch {
		return "Check the dates, times and occurrence count (1–52).";
	}
	return undefined;
};
export const createOccurrences = (id: string, draft: EventDraft): ClubEvent[] =>
	occurrenceDates(draft).map((date, index) => {
		const window = signupWindow(date, draft, Date.now());
		const event: ClubEvent = {
			timeZone: draft.timeZone ?? defaultClubTimeZone,
			parts: draft.parts,
			public: draft.public ?? false,
			seriesOrder: index,
			seriesDate: date,
			seasonId: draft.seasonId ?? defaultSeasonId,
			id: `${id}-${index}`,
			title: draft.title.trim(),
			date,
			start: draft.start,
			end: draft.end,
			venue: draft.venue.trim(),
			program: draft.program,
			kind: draft.kind,
			repeatInterval: draft.repeatInterval,
			repeatUntil: draft.repeatUntil,
			registrationOpen: draft.registrationOpen,
			registrationCloseHours: draft.registrationCloseHours,
			capacity: draft.capacity,
			description: draft.description.trim(),
			signup: "open",
			cancelled: false,
			seriesId: draft.repeat !== "once" ? id : undefined,
			repeat: draft.repeat,
			eligiblePersonIds: draft.eligiblePersonIds,
			signupOpens: draft.signupOpens ?? "now",
			signupCloses: draft.signupCloses ?? "start",
			...window,
		};
		return { ...event, signup: signupState(event, Date.now()) };
	});
export const applicableTrackers = (
	data: AppData,
	_member: Member,
): AppData["trackers"] =>
	data.trackers.map((tracker) =>
		tracker.id === "membership"
			? { ...tracker, name: "CUGA membership", kind: "check" }
			: tracker,
	);
export const visibleNotices = (
	data: AppData,
	_account: Account,
): AppData["notices"] => data.notices;
