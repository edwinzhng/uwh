import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import ICAL from "ical.js";
import Papa from "papaparse";
import {
	proposeMigrationIdentity,
	type SourcePerson,
} from "./migration-identities";

const root = resolve(import.meta.dir, "../../data/migration-2026-11-01");
const basePath = resolve(root, "base44");
const readCsv = async (name: string): Promise<Record<string, string>[]> => {
	const text = await Bun.file(resolve(basePath, `${name}_export.csv`)).text();
	if (!text.trim()) return [];
	const parsed = Papa.parse<Record<string, string>>(text, {
		header: true,
		skipEmptyLines: true,
	});
	if (parsed.errors.length) throw new Error(`${name} CSV has parse errors.`);
	if (parsed.data.some((row) => !row.id))
		throw new Error(`${name} records are missing source IDs.`);
	if (new Set(parsed.data.map((row) => row.id)).size !== parsed.data.length)
		throw new Error(`${name} has duplicate source IDs.`);
	return parsed.data;
};

type LegacyPlayer = { _id: string; fullName: string; sporteasyId?: number };
type Registration = {
	firstName: string;
	lastName: string;
	submittedAt: string;
};
type SheetRow = Record<string, string>;

const basePlayers = await readCsv("Player");
const legacyPlayers: LegacyPlayer[] = await Bun.file(
	resolve(root, "legacy/players.json"),
).json();
const roster: SheetRow[] = await Bun.file(
	resolve(root, "sporteasy/SportEasy_calgary-crocs.json"),
).json();
const registrations: Registration[] = await Bun.file(
	resolve(root, "registration/responses-minimized.json"),
).json();

const basePeople: SourcePerson[] = basePlayers.map((row) => ({
	source: "base44",
	sourceId: row.id ?? "",
	name: row.full_name ?? "",
	sporteasyId: row.sporteasy_id || undefined,
}));
const legacyPeople: SourcePerson[] = legacyPlayers.map((row) => ({
	source: "legacy",
	sourceId: row._id,
	name: row.fullName,
	sporteasyId: row.sporteasyId ? String(row.sporteasyId) : undefined,
}));
const sportPeople: SourcePerson[] = roster.slice(1).map((row, index) => ({
	source: "sporteasy",
	sourceId: `roster-row:${index + 2}`,
	name: `${row.B ?? ""} ${row.A ?? ""}`.trim(),
}));
const registrationPeople: SourcePerson[] = registrations.map((row, index) => ({
	source: "registration",
	sourceId: `response-row:${index + 2}`,
	name: `${row.firstName} ${row.lastName}`.trim(),
}));

const approvals: { approvedDuplicateSourceIds: string[][] } = await Bun.file(
	resolve(root, "approvals.json"),
).json();
const propose = (
	person: SourcePerson,
	people: SourcePerson[],
): ReturnType<typeof proposeMigrationIdentity> =>
	proposeMigrationIdentity(
		person,
		people,
		approvals.approvedDuplicateSourceIds,
	);
const identityProposals = [
	...basePeople.map((person) => propose(person, legacyPeople)),
	...sportPeople.map((person) =>
		propose(person, [...legacyPeople, ...basePeople]),
	),
	...registrationPeople.map((person) =>
		propose(person, [...legacyPeople, ...basePeople, ...sportPeople]),
	),
];

const baseFiles = (await readdir(basePath)).filter((file) =>
	file.endsWith(".csv"),
);
const sources = await Promise.all(
	baseFiles.sort().map(async (file) => {
		const bytes = await Bun.file(resolve(basePath, file)).arrayBuffer();
		return {
			file: `base44/${file}`,
			rows: (await readCsv(file.replace("_export.csv", ""))).length,
			sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
		};
	}),
);

const calendar = new ICAL.Component(
	ICAL.parse(await Bun.file(resolve(root, "sporteasy/calendar.ics")).text()),
);
const calendarEvents = calendar
	.getAllSubcomponents("vevent")
	.map((event) => new ICAL.Event(event));
const dates = calendarEvents.map((event) => event.startDate.toString()).sort();
const attendance = await readCsv("AttendanceRSVP");
const videos = await readCsv("VideoClip");
const legacyCounts = Object.fromEntries(
	await Promise.all(
		[
			"practices",
			"practiceAttendance",
			"practiceCoaches",
			"fitnessTests",
			"fitnessTestSessions",
			"fitnessTestResults",
		].map(async (table): Promise<[string, number]> => {
			const records: object[] = await Bun.file(
				resolve(root, "legacy", `${table}.json`),
			).json();
			return [table, records.length];
		}),
	),
);
const report = {
	status: "preflight-only-no-destination-writes",
	targetEmail: "edwinzhang64@gmail.com",
	target: "private-local-club-only",
	sources,
	legacyCounts,
	counts: {
		basePlayers: basePeople.length,
		legacyPlayers: legacyPeople.length,
		sportEasyRoster: sportPeople.length,
		registrationResponses: registrationPeople.length,
		calendarEvents: calendarEvents.length,
		baseRsvps: attendance.length,
		baseObservedAttendance: attendance.filter((row) => row.attendance_status)
			.length,
		videos: videos.length,
		videoLinks: videos.filter((row) => row.video_url).length,
		voiceNoteLinks: videos.filter((row) => row.voice_note_url).length,
		uploadedVideoLinks: videos.filter(
			(row) =>
				row.video_url && new URL(row.video_url).hostname === "base44.app",
		).length,
	},
	calendar: {
		first: dates.at(0),
		last: dates.at(-1),
		duplicateUids:
			calendarEvents.length -
			new Set(calendarEvents.map((event) => event.uid)).size,
	},
	identityProposals,
	restrictions: [
		"Do not write to production or the demo club.",
		"Do not grant source roles, link login accounts, or import authentication records.",
		"Registration is submitted, not proof of payment, insurance, or new-app terms acceptance.",
		"Exclude medical answers, health-card numbers, and addresses from the app import.",
		"Preserve original RSVP intent separately from observed attendance.",
		"Do not merge same-date events without checking time, program, and source IDs.",
		"Keep original video and voice-note links until file copies are verified.",
		"Roster row references require the archived workbook; obtain stable SportEasy profile IDs before committing.",
	],
};
await Bun.write(
	resolve(root, "preflight.json"),
	JSON.stringify(report, undefined, 2),
);
console.log(
	JSON.stringify(
		{
			status: report.status,
			counts: report.counts,
			legacyCounts,
			calendar: report.calendar,
			identityReviewCount: identityProposals.filter(
				(proposal) => proposal.status === "review",
			).length,
			unmatchedRegistrations: identityProposals
				.filter(
					(proposal) =>
						proposal.person.source === "registration" &&
						proposal.status !== "match",
				)
				.map((proposal) => proposal.person.name),
		},
		undefined,
		2,
	),
);
