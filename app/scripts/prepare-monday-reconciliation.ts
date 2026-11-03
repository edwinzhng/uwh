import { chmod, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { migrationMondayPairs } from "../convex/migration_monday";
import { migrationName } from "./migration-identities";
import { buildMigrationSchedule } from "./migration-schedule";
import {
	fingerprint,
	type LegacyPlayer,
	migrationCalendar,
	migrationPeople,
	migrationRoot,
	type RegistrationRow,
	readBaseTables,
	readLegacy,
	type SourceRow,
} from "./migration-source";

type ScheduleInput = Parameters<typeof buildMigrationSchedule>[0];
const tables = await readBaseTables();
const legacy = await readLegacy<LegacyPlayer>("players");
const registrations: RegistrationRow[] = await Bun.file(
	resolve(migrationRoot, "registration/responses-minimized.json"),
).json();
const rawRoster: SourceRow[] = await Bun.file(
	resolve(migrationRoot, "sporteasy/SportEasy_calgary-crocs.json"),
).json();
const rosterIds: { name: string; url: string }[] = await Bun.file(
	resolve(migrationRoot, "sporteasy/roster-identities-rendered.json"),
).json();
const roster = rawRoster.slice(1).map((row): SourceRow => {
	const name = migrationName(`${row.B ?? ""} ${row.A ?? ""}`);
	const ids = [
		...new Set(
			rosterIds
				.filter(
					(entry) => migrationName(entry.name.replace(/^\d+/, "")) === name,
				)
				.flatMap((entry) => {
					const id = entry.url.match(/\/members\/(\d+)\//)?.at(1);
					return id ? [id] : [];
				}),
		),
	];
	const id = ids.at(0);
	if (!id || ids.length !== 1)
		throw new Error(
			"Roster identity is ambiguous; retain Monday source records.",
		);
	return { ...row, _sporteasyId: id };
});
const approvals: { approvedDuplicateSourceIds: string[][] } = await Bun.file(
	resolve(migrationRoot, "approvals.json"),
).json();
const people = migrationPeople(
	tables.Player ?? [],
	legacy,
	roster,
	registrations,
	approvals.approvedDuplicateSourceIds,
);
const columns: { columns: ScheduleInput["columns"] } = await Bun.file(
	resolve(migrationRoot, "sporteasy/attendance-event-columns.json"),
).json();
const schedule = buildMigrationSchedule({
	tables,
	calendar: await migrationCalendar(tables.Program ?? []),
	legacyPractices:
		await readLegacy<ScheduleInput["legacyPractices"][number]>("practices"),
	legacyAttendance:
		await readLegacy<ScheduleInput["legacyAttendance"][number]>(
			"practiceAttendance",
		),
	presence: await Bun.file(
		resolve(migrationRoot, "sporteasy/bilan_presence_calgary-crocs.json"),
	).json(),
	columns: columns.columns,
	person: (source, id): string => {
		const person = people.find((row) =>
			source === "base44"
				? row.base.some((entry) => entry.id === id)
				: source === "legacy"
					? row.legacy.some((entry) => entry._id === id)
					: row.roster.some(
							(entry) =>
								migrationName(`${entry.B} ${entry.A}`) === migrationName(id),
						),
		);
		if (!person)
			throw new Error("Monday response has an unresolved approved identity.");
		return person.id;
	},
});
const pairs = migrationMondayPairs(schedule.events.map((row) => row.value));
const event = (
	id: string,
): {
	sourceId: string;
	fingerprint: string;
	value: ScheduleInput["calendar"][number]["value"];
} => {
	const row = schedule.events.find((entry) => entry.value.id === id);
	if (!row) throw new Error("Missing original Monday event envelope.");
	return {
		...row,
		fingerprint: fingerprint({ kind: "events", value: row.value }),
	};
};
const plan = pairs.map((pair) => ({
	dryRun: true,
	source: event(pair.sourceId),
	target: event(pair.targetId),
	responses: schedule.responses
		.filter(
			(row) =>
				row.value.eventId === pair.sourceId ||
				row.value.eventId === pair.targetId,
		)
		.map((row) => ({
			...row,
			fingerprint: fingerprint({ kind: "responses", value: row.value }),
		})),
}));
const path = resolve(migrationRoot, "monday-reconciliation-plan.json");
await writeFile(path, JSON.stringify(plan, undefined, 2), { mode: 0o600 });
await chmod(path, 0o600);
console.log(
	JSON.stringify({
		sourceOnly: true,
		pairs: plan.length,
		responseBaselines: plan.reduce(
			(total, pair) => total + pair.responses.length,
			0,
		),
		file: "monday-reconciliation-plan.json",
	}),
);
