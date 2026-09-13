import { validateEvent, validDate } from "./app-rules";
import type { EventDraft, EventResponse, Member } from "./app-types";

export type ImportKind =
	| "members"
	| "events"
	| "attendance"
	| "registration"
	| "payments";
export type ImportRow = Record<string, string>;
export type ImportRecord =
	| { kind: "members"; sourceId: string; name: string; memberId?: string }
	| { kind: "events"; sourceId: string; draft: EventDraft }
	| {
			kind: "attendance";
			sourceId: string;
			person: string;
			event: string;
			response: EventResponse["response"];
			attendance: EventResponse["attendance"];
	  }
	| {
			kind: "registration";
			sourceId: string;
			person: string;
			seasonId: string;
			status: Member["registration"];
			cuga: boolean;
			dues: number;
	  }
	| {
			kind: "payments";
			sourceId: string;
			person: string;
			seasonId: string;
			amount: number;
			note: string;
			date: string;
	  };
export const importKinds = [
	{ value: "members", label: "Members" },
	{ value: "events", label: "Events" },
	{ value: "attendance", label: "Attendance" },
	{ value: "registration", label: "Registration & dues" },
	{ value: "payments", label: "Payments" },
] as const;
export const importFields: Record<
	ImportKind,
	{ key: string; label: string; required?: boolean }[]
> = {
	members: [
		{ key: "source_id", label: "Source ID", required: true },
		{ key: "name", label: "Full name", required: true },
		{ key: "member_id", label: "Existing member ID" },
	],
	events: [
		{ key: "source_id", label: "Source ID", required: true },
		{ key: "title", label: "Title", required: true },
		{ key: "date", label: "Date (YYYY-MM-DD)", required: true },
		{ key: "start", label: "Start (HH:mm)", required: true },
		{ key: "end", label: "End (HH:mm)", required: true },
		{ key: "venue", label: "Venue", required: true },
		{ key: "capacity", label: "Capacity" },
		{ key: "type", label: "Type" },
	],
	attendance: [
		{ key: "source_id", label: "Source ID", required: true },
		{ key: "member_id", label: "Member ID", required: true },
		{ key: "event_id", label: "Event ID", required: true },
		{ key: "response", label: "Response", required: true },
		{ key: "attendance", label: "Attendance", required: true },
	],
	registration: [
		{ key: "source_id", label: "Source ID", required: true },
		{ key: "member_id", label: "Member ID", required: true },
		{ key: "status", label: "Registration status", required: true },
		{ key: "cuga", label: "CUGA membership", required: true },
		{ key: "dues", label: "Dues (CAD)", required: true },
	],
	payments: [
		{ key: "source_id", label: "Source ID", required: true },
		{ key: "member_id", label: "Member ID", required: true },
		{ key: "amount", label: "Amount (CAD)", required: true },
		{ key: "date", label: "Payment date", required: true },
		{ key: "note", label: "Reference / note", required: true },
	],
};
const required = (row: ImportRow, field: string): string => {
	const value = row[field]?.trim();
	if (!value) throw new Error(`${field.replaceAll("_", " ")} is required.`);
	if (value.length > 300) throw new Error(`${field} is too long.`);
	return value;
};
const choice = <Value extends string>(
	value: string,
	choices: readonly Value[],
): Value => {
	const found = choices.find((choice) => choice === value.toLowerCase());
	if (!found) throw new Error(`Use ${choices.join(", ")}.`);
	return found;
};
const cents = (text: string): number => {
	const currency = text.replace(/^\$\s*/, "");
	if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(\.\d{1,2})?$/.test(currency))
		throw new Error("Use a positive CAD amount with up to 2 decimals.");
	const amount = Math.round(Number(currency.replaceAll(",", "")) * 100);
	if (!Number.isSafeInteger(amount) || amount > 100_000_000)
		throw new Error("Amount exceeds $1,000,000.");
	return amount;
};
export const importRecord = (
	kind: ImportKind,
	row: ImportRow,
	seasonId: string,
): ImportRecord => {
	const sourceId = required(row, "source_id");
	if (sourceId.length > 100) throw new Error("Source ID is too long.");
	if (kind === "members")
		return {
			kind,
			sourceId,
			name: required(row, "name"),
			memberId: row.member_id?.trim() || undefined,
		};
	if (kind === "events") {
		const draft: EventDraft = {
			title: required(row, "title"),
			date: required(row, "date"),
			start: required(row, "start"),
			end: required(row, "end"),
			venue: required(row, "venue"),
			seasonId,
			capacity: row.capacity ? Number(row.capacity) : undefined,
			kind: choice(row.type?.trim() || "training", [
				"training",
				"hockey",
				"social",
				"meeting",
				"tournament",
			]),
			description: "",
			program: "club",
			repeat: "once",
			public: false,
		};
		const error = validateEvent(draft);
		if (error) throw new Error(error);
		return { kind, sourceId, draft };
	}
	const person = required(row, "member_id");
	if (kind === "attendance")
		return {
			kind,
			sourceId,
			person,
			event: required(row, "event_id"),
			response: choice(required(row, "response"), [
				"going",
				"unavailable",
				"unanswered",
				"waiting",
			]),
			attendance: choice(required(row, "attendance"), [
				"present",
				"late",
				"absent",
				"unmarked",
			]),
		};
	if (kind === "registration")
		return {
			kind,
			sourceId,
			person,
			seasonId,
			status: choice(required(row, "status"), [
				"missing",
				"submitted",
				"approved",
			]),
			cuga: choice(required(row, "cuga"), ["yes", "no"]) === "yes",
			dues: cents(required(row, "dues")),
		};
	const date = required(row, "date");
	if (!validDate(date)) throw new Error("Use YYYY-MM-DD for dates.");
	const amount = cents(required(row, "amount"));
	if (!amount) throw new Error("Payment must exceed zero.");
	return {
		kind,
		sourceId,
		person,
		seasonId,
		amount,
		note: required(row, "note"),
		date,
	};
};
