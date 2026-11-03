import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Temporal } from "@js-temporal/polyfill";
import type { Infer } from "convex/values";
import ICAL from "ical.js";
import Papa from "papaparse";
import type { Doc } from "../convex/_generated/dataModel";
import type { localMigrationRecord } from "../convex/local_migration_schema";
import { migrationName } from "./migration-identities";

export type MigrationRecord = Infer<typeof localMigrationRecord>;
export type SourceRow = Record<string, string>;
export type LegacyPlayer = {
	_id: string;
	fullName: string;
	email?: string;
	positions?: string[];
	rating: number;
	youth?: boolean;
	sporteasyId?: number;
};
export type RegistrationRow = {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	submittedAt: string;
	feePaidAnswer: string;
};
export const migrationRoot = resolve(
	import.meta.dir,
	"../../data/migration-2026-11-01",
);
export const fingerprint = (value: object | string): string =>
	createHash("sha256")
		.update(typeof value === "string" ? value : JSON.stringify(value))
		.digest("hex");
export const readLegacy = async <Value>(name: string): Promise<Value[]> =>
	Bun.file(resolve(migrationRoot, "legacy", `${name}.json`)).json();
export const readBaseTables = async (): Promise<Record<string, SourceRow[]>> =>
	Object.fromEntries(
		await Promise.all(
			(await readdir(resolve(migrationRoot, "base44")))
				.filter((file) => file.endsWith(".csv"))
				.map(async (file): Promise<[string, SourceRow[]]> => {
					const text = await Bun.file(
						resolve(migrationRoot, "base44", file),
					).text();
					if (!text.trim()) return [file.replace("_export.csv", ""), []];
					const parsed = Papa.parse<SourceRow>(text, {
						header: true,
						skipEmptyLines: true,
					});
					if (parsed.errors.length) throw new Error(`Invalid CSV: ${file}`);
					return [file.replace("_export.csv", ""), parsed.data];
				}),
		),
	);
export const sourceDate = (value: string | number): string =>
	typeof value === "number" || /T|Z/.test(String(value))
		? Temporal.Instant.from(
				typeof value === "number" ? new Date(value).toISOString() : value,
			)
				.toZonedDateTimeISO("America/Edmonton")
				.toPlainDate()
				.toString()
		: String(value).slice(0, 10);
export const sourceTime = (value: number): string =>
	Temporal.Instant.fromEpochMilliseconds(value)
		.toZonedDateTimeISO("America/Edmonton")
		.toPlainTime()
		.toString()
		.slice(0, 5);
export const seasonFor = (date: string): string =>
	`${Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 9 ? 1 : 0)}-${Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) >= 9 ? 1 : 0)}`;
export const sourcePositions = (
	positions: readonly string[],
): Doc<"playerCoaching">["positions"] => [
	...new Set(
		positions.flatMap((value): Doc<"playerCoaching">["positions"] => {
			const key = value.toUpperCase().replace(/[ _-]/g, "");
			if (["FORWARD", "LF", "RF", "CF"].includes(key)) return ["FORWARD"];
			if (["WING", "LW", "RW"].includes(key)) return ["WING"];
			if (["CENTER", "CENTRE", "C"].includes(key)) return ["CENTER"];
			if (["FULLBACK", "BACK", "FB", "LFB", "RFB"].includes(key))
				return ["FULL_BACK"];
			return [];
		}),
	),
];
export const sourceArray = <Value>(text: string | undefined): Value[] =>
	text ? JSON.parse(text) : [];

export type MigrationPerson = {
	id: string;
	name: string;
	base: SourceRow[];
	legacy: LegacyPlayer[];
	roster: SourceRow[];
	registrations: RegistrationRow[];
};
export const migrationPeople = (
	base: readonly SourceRow[],
	legacy: readonly LegacyPlayer[],
	roster: readonly SourceRow[],
	registrations: readonly RegistrationRow[],
	approvedDuplicateSourceIds: readonly (readonly string[])[] = [],
): MigrationPerson[] => {
	const groups = new Map<string, MigrationPerson>();
	const sportIds = new Map<string, MigrationPerson>();
	const origins = new Map<
		MigrationPerson,
		{ source: string; id: string; sportId?: string }[]
	>();
	const seen = new Set<string>();
	const add = (
		name: string,
		source: string,
		id: string,
		sportId?: string,
	): MigrationPerson => {
		const key = migrationName(name);
		if (!key) throw new Error("A source person has no name.");
		if (seen.has(id)) throw new Error(`Duplicate source identity: ${id}`);
		seen.add(id);
		const bySport = sportId ? sportIds.get(sportId) : undefined;
		const byName = groups.get(key);
		if (bySport && byName && bySport !== byName)
			throw new Error(`Conflicting source identity: ${id}`);
		const existing = bySport ?? byName;
		const previous = existing ? (origins.get(existing) ?? []) : [];
		const conflictingOrigins = previous.filter(
			(entry) => entry.sportId && entry.sportId !== sportId,
		);
		const approvedOrigins = approvedDuplicateSourceIds.some(
			(group) =>
				(group.includes(id) ||
					Boolean(sportId && group.includes(`sporteasy:${sportId}`))) &&
				conflictingOrigins.every((entry) => group.includes(entry.id)),
		);
		if (
			sportId &&
			!bySport &&
			!approvedOrigins &&
			previous.some((entry) => entry.sportId && entry.sportId !== sportId)
		)
			throw new Error(`Conflicting SportEasy identity: ${id}`);
		const sameSource = previous.filter((entry) => entry.source === source);
		if (
			sameSource.length &&
			!approvedDuplicateSourceIds.some(
				(group) =>
					group.includes(id) &&
					sameSource.every((entry) => group.includes(entry.id)),
			)
		)
			throw new Error(`Unapproved same-source identity collision: ${id}`);
		const next: MigrationPerson = existing ?? {
			id:
				key === "edwin zhang"
					? "edwin"
					: `person:${fingerprint(key).slice(0, 20)}`,
			name: name.trim(),
			base: [],
			legacy: [],
			roster: [],
			registrations: [],
		};
		groups.set(key, next);
		if (sportId) sportIds.set(sportId, next);
		origins.set(next, [...previous, { source, id, sportId }]);
		return next;
	};
	for (const row of legacy)
		add(
			row.fullName,
			"legacy",
			`legacy:${row._id}`,
			row.sporteasyId === undefined ? undefined : String(row.sporteasyId),
		).legacy.push(row);
	for (const row of base)
		add(
			row.full_name ?? "",
			"base44",
			`base44:${row.id}`,
			row.sporteasy_id?.trim() || undefined,
		).base.push(row);
	for (const [index, row] of roster.entries())
		add(
			`${row.B ?? ""} ${row.A ?? ""}`,
			"sporteasy",
			row._sporteasyId
				? `sporteasy:${row._sporteasyId}`
				: `sporteasy:roster-row:${index + 2}`,
			row._sporteasyId?.trim() || undefined,
		).roster.push(row);
	for (const [index, row] of registrations.entries())
		add(
			`${row.firstName} ${row.lastName}`,
			"registration",
			`registration:response-row:${index + 2}`,
		).registrations.push(row);
	return [...new Set(groups.values())].map((person) => ({
		...person,
		name:
			person.base.at(0)?.full_name?.trim() ||
			person.legacy.at(0)?.fullName.trim() ||
			person.name,
	}));
};

export type SourceCalendarEvent = {
	uid: string;
	value: Doc<"events">["value"];
};
export const migrationCalendar = async (
	programs: readonly SourceRow[],
	capturedAt = Date.parse("2026-11-01T00:00:00Z"),
): Promise<SourceCalendarEvent[]> => {
	if (!Number.isFinite(capturedAt))
		throw new Error("A fixed source snapshot timestamp is required.");
	const calendar = new ICAL.Component(
		ICAL.parse(
			await Bun.file(resolve(migrationRoot, "sporteasy/calendar.ics")).text(),
		),
	);
	return calendar
		.getAllSubcomponents("vevent")
		.map((component): SourceCalendarEvent => {
			const event = new ICAL.Event(component);
			const start = event.startDate.toJSDate().getTime();
			const end = event.endDate.toJSDate().getTime();
			const date = sourceDate(start);
			const weekday = Temporal.PlainDate.from(date).dayOfWeek;
			const isTraining = /training/i.test(event.summary);
			const day =
				weekday === 1
					? "Monday"
					: weekday === 4
						? "Thursday"
						: weekday === 5
							? "Friday"
							: weekday === 7
								? "Sunday"
								: "";
			const program = programs.find(
				(row) =>
					row.day_of_week === day &&
					(weekday === 1 ||
						(isTraining ? row.type === "Training" : row.type === "Game")),
			);
			return {
				uid: event.uid,
				value: {
					id: `sporteasy:${event.uid}`,
					title: event.summary.replace(/^Calgary Crocs\s*-\s*/i, ""),
					date,
					endDate: sourceDate(end) !== date ? sourceDate(end) : undefined,
					start: sourceTime(start),
					end: sourceTime(end),
					venue: event.location || "MNP Community & Sport Centre",
					program: program ? `base44:${program.id}` : "club",
					kind: isTraining ? "training" : "hockey",
					signup: end <= capturedAt ? "closed" : "open",
					description: event.description ?? "",
					cancelled: component.getFirstPropertyValue("status") === "CANCELLED",
					timeZone: "America/Edmonton",
					seasonId: seasonFor(date),
				},
			};
		});
};

export const migrationMember = (
	person: MigrationPerson,
): Doc<"members">["value"] => {
	const base = [...person.base]
		.sort((a, b) => (b.updated_date ?? "").localeCompare(a.updated_date ?? ""))
		.at(0);
	const legacy = person.legacy.at(0);
	const sourceRating = base?.skill_score?.trim()
		? Number(base.skill_score)
		: legacy?.rating;
	if (sourceRating !== undefined && !Number.isFinite(sourceRating))
		throw new Error("Invalid source player rating.");
	const rating = sourceRating ?? 0;
	const basePositions = sourceArray<string>(base?.positions);
	const positions = sourcePositions(
		basePositions.length ? basePositions : (legacy?.positions ?? []),
	);
	const progress = sourceArray<object>(base?.goal_progress);
	const goal =
		base?.focus_goal === "Other" ? base.focus_goal_custom : base?.focus_goal;
	return {
		id: person.id,
		name: person.name,
		archived: base?.archived === "true" || undefined,
		archivedAt: base?.archived_date || undefined,
		programs: ["club"],
		position: positions.at(0) ?? "",
		rating,
		...(sourceRating === undefined ? { ratingKnown: false } : {}),
		registration: person.registrations.length ? "submitted" : "missing",
		goal: [goal, base?.focus_goal_remarks].filter(Boolean).join(" · "),
		steps: Math.min(6, progress.length),
	};
};

export const fitnessNumber = (
	value: string,
	unit: "time" | "count",
): number => {
	const parts = value.trim().split(":").map(Number);
	const number =
		unit === "time" && parts.length > 1
			? parts.reduce((sum, part) => sum * 60 + part, 0)
			: Number(value);
	if (!Number.isFinite(number) || number < 0)
		throw new Error("Invalid source fitness result.");
	return number;
};
