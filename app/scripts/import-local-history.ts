import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Doc, Id, TableNames } from "../convex/_generated/dataModel";
import { buildMigrationContent } from "./migration-content";
import { migrationName } from "./migration-identities";
import { buildMigrationSchedule } from "./migration-schedule";
import {
	fingerprint,
	fitnessNumber,
	type LegacyPlayer,
	type MigrationRecord,
	migrationCalendar,
	migrationMember,
	migrationPeople,
	migrationRoot,
	type RegistrationRow,
	readBaseTables,
	readLegacy,
	type SourceRow,
	seasonFor,
	sourceArray,
	sourceDate,
	sourcePositions,
} from "./migration-source";

type Outcome = {
	sourceId: string;
	kind: string;
	targetId: string;
	status: string;
};
type Status = {
	clubId: Id<"clubs">;
	ownerId: Id<"users">;
	references: Outcome[];
	counts: Record<string, number>;
	archived: number;
	deliveryDisabled: boolean;
};
type Entry = { sourceId: string; record: MigrationRecord };
const apply = process.argv.includes("--apply");
const run = async <Result>(name: string, args: object): Promise<Result> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			name,
			JSON.stringify(args),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if ((await child.exited) !== 0) {
		const directory = resolve(migrationRoot, "private-errors");
		await mkdir(directory, { recursive: true, mode: 0o700 });
		const filename = `${fingerprint({ name, stderr }).slice(0, 20)}.log`;
		await writeFile(resolve(directory, filename), stderr, { mode: 0o600 });
		throw new Error(
			`Local operation ${name} failed. Details saved privately in private-errors/${filename}.`,
		);
	}
	try {
		return JSON.parse(stdout.trim() || "null");
	} catch {
		throw new Error(`Local operation ${name} returned an invalid response.`);
	}
};
const status = await run<Status>("local_migration:status", {});
if (!status.deliveryDisabled) throw new Error("Outbound guard missing.");
const destination = new Map(
	status.references.map((row) => [`${row.kind}:${row.sourceId}`, row.targetId]),
);
const importedId = <Table extends TableNames>(
	kind: Table,
	sourceId: string,
): Id<Table> => {
	const id = destination.get(`${kind}:${sourceId}`);
	if (!id) throw new Error(`Missing imported dependency: ${kind}:${sourceId}`);
	return id as Id<Table>;
};
const importedActor = (key: string): Id<"users"> => {
	const id = destination.get(`actors:${key}`);
	if (!id) throw new Error(`Missing historical author: ${key}`);
	return id as Id<"users">;
};
const write = async (entries: readonly Entry[]): Promise<void> => {
	for (const offset of Array.from(
		{ length: Math.ceil(entries.length / 25) },
		(_, index) => index * 25,
	)) {
		const batch = entries
			.slice(offset, offset + 25)
			.map((entry) => ({ ...entry, fingerprint: fingerprint(entry.record) }));
		await run("local_migration:apply", { dryRun: true, entries: batch });
		if (apply)
			for (const row of await run<Outcome[]>("local_migration:apply", {
				dryRun: false,
				entries: batch,
			}))
				destination.set(`${row.kind}:${row.sourceId}`, row.targetId);
	}
	console.log(
		`${entries.at(0)?.record.kind ?? "records"}: ${entries.length} ${apply ? "reconciled" : "planned"}`,
	);
};
const tables = await readBaseTables();
const table = (name: string): SourceRow[] => tables[name] ?? [];
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
	const matches = rosterIds.filter(
		(entry) => migrationName(entry.name.replace(/^\d+/, "")) === name,
	);
	const ids = [
		...new Set(
			matches.flatMap((entry) => {
				const id = entry.url.match(/\/members\/(\d+)\//)?.at(1);
				return id ? [id] : [];
			}),
		),
	];
	const id = ids.at(0);
	if (!id || ids.length !== 1)
		throw new Error(
			"Roster identity could not be verified against the live source.",
		);
	return { ...row, _sporteasyId: id };
});
const approvals: { approvedDuplicateSourceIds: string[][] } = await Bun.file(
	resolve(migrationRoot, "approvals.json"),
).json();
const people = migrationPeople(
	table("Player"),
	legacy,
	roster,
	registrations,
	approvals.approvedDuplicateSourceIds,
);
const basePerson = (id: string): string => {
	const person = people.find((row) =>
		row.base.some((entry) => entry.id === id),
	);
	if (!person) throw new Error(`Unmapped Base44 player ${id}`);
	return person.id;
};
const legacyPerson = (id: string): string => {
	const person = people.find((row) =>
		row.legacy.some((entry) => entry._id === id),
	);
	if (!person) throw new Error(`Unmapped legacy player ${id}`);
	return person.id;
};
const program = (id: string): string => (id ? `base44:${id}` : "club");
const calendar = await migrationCalendar(table("Program"));
const legacyPractices = await readLegacy<{
	_id: string;
	date: number;
	sporteasyId?: number;
	notes?: string;
}>("practices");
const legacyAttendance = await readLegacy<{
	_id: string;
	practiceId: string;
	playerId: string;
	attended: boolean;
}>("practiceAttendance");
const presence: SourceRow[] = await Bun.file(
	resolve(migrationRoot, "sporteasy/bilan_presence_calgary-crocs.json"),
).json();
const columnSource: { columns: { index: number; eventId: string }[] } =
	await Bun.file(
		resolve(migrationRoot, "sporteasy/attendance-event-columns.json"),
	).json();
const schedule = buildMigrationSchedule({
	tables,
	calendar,
	legacyPractices,
	legacyAttendance,
	presence,
	columns: columnSource.columns,
	person: (source, id): string => {
		if (source === "base44") return basePerson(id);
		if (source === "legacy") return legacyPerson(id);
		const person = people.find((row) =>
			row.roster.some(
				(entry) => migrationName(`${entry.B} ${entry.A}`) === migrationName(id),
			),
		);
		if (!person)
			throw new Error("Attendance member is missing from the verified roster.");
		return person.id;
	},
});
console.log(
	JSON.stringify({
		people: people.length,
		registrations: registrations.length,
		schedule: schedule.summary,
		videos: table("VideoClip").length,
		sourceOnly: !apply,
	}),
);
if (!apply) process.exit(0);

const seasons = [2024, 2025, 2026].map((year) => ({
	id: `${year}-${year + 1}`,
	name: `${year}–${year + 1}`,
	start: `${year}-09-01`,
	end: `${year + 1}-08-31`,
}));
const programs = table("Program").map(
	(row): NonNullable<Doc<"clubs">["programs"]>[number] => ({
		id: program(row.id ?? ""),
		name: row.name ?? "Program",
		archived: row.is_active === "false",
		status: row.status === "active" ? "active" : "completed",
		kind: row.type === "Training" ? "training" : "hockey",
		seasonId: seasonFor(row.start_date ?? "2026-09-01"),
		revision: 0,
		rsvp: {
			openDays: Number(row.rsvp_open_days_before || 0),
			openTime: row.rsvp_open_time || "12:00",
			closeDays: Number(row.rsvp_lock_days_before || 0),
			closeTime: row.rsvp_lock_time || "12:00",
			reminderDays: 1,
			defaultResponse: "none",
		},
	}),
);
await run("local_migration:configure", {
	dryRun: false,
	programs,
	seasons,
	venues: [
		...new Set(schedule.events.map((row) => row.value.venue).filter(Boolean)),
	],
});
await write(
	people.map((person): Entry => {
		const value = migrationMember(person);
		const memberships = table("ProgramMembership").filter(
			(row) =>
				row.is_active !== "false" &&
				person.base.some((entry) => entry.id === row.player_id),
		);
		return {
			sourceId: person.id,
			record: {
				kind: "members",
				value: {
					...value,
					programs: [
						...new Set([
							"club",
							...memberships.map((row) => program(row.program_id ?? "")),
						]),
					],
				},
			},
		};
	}),
);
await write(
	people.map(
		(person): Entry => ({
			sourceId: person.id,
			record: {
				kind: "actors",
				value: { personId: person.id, name: person.name },
			},
		}),
	),
);
const actorPerson = (name: string, email?: string): string => {
	const nameMatches = people.filter(
		(row) => migrationName(row.name) === migrationName(name),
	);
	const emailMatches = email
		? people.filter(
				(row) =>
					row.base.some(
						(entry) =>
							entry.email?.trim().toLowerCase() === email.trim().toLowerCase(),
					) ||
					row.legacy.some(
						(entry) =>
							entry.email?.trim().toLowerCase() === email.trim().toLowerCase(),
					),
			)
		: [];
	const emailMatch = emailMatches.length === 1 ? emailMatches.at(0) : undefined;
	const nameMatch = nameMatches.length === 1 ? nameMatches.at(0) : undefined;
	if (emailMatch && nameMatch && emailMatch.id !== nameMatch.id)
		throw new Error(
			"Conflicting historical author name and email require review.",
		);
	if (emailMatch) return emailMatch.id;
	if (nameMatch) {
		if (
			emailMatches.length &&
			!emailMatches.some((entry) => entry.id === nameMatch.id)
		)
			throw new Error(
				"Historical author does not match the shared email profiles.",
			);
		return nameMatch.id;
	}
	if (!name && !email) throw new Error("Historical author has no identity.");
	return `author:${fingerprint({ name, email }).slice(0, 24)}`;
};
const sourceAuthors = [
	...table("PlayerScore").map((row) => ({
		name: row.coach_name ?? "",
		email: row.coach_email,
	})),
	...[
		...table("SessionCheckin"),
		...table("ChatMessage"),
		...table("DirectMessage"),
		...table("Session"),
		...table("VideoClip"),
		...table("TeamDoc"),
	].map((row) => ({
		name: row.sender_name ?? "",
		email: row.sender_email || row.created_by,
	})),
];
const extraAuthors = new Map(
	sourceAuthors.map(({ name, email }) => [
		actorPerson(name, email),
		name || "Historical author",
	]),
);
await write(
	[...extraAuthors]
		.filter(([id]) => !destination.has(`actors:${id}`))
		.map(
			([id, name]): Entry => ({
				sourceId: id,
				record: { kind: "actors", value: { personId: id, name } },
			}),
		),
);
const author = (name: string, email?: string): Id<"users"> =>
	importedActor(actorPerson(name, email));
await write(
	people.map((person): Entry => {
		const base = person.base.at(0);
		const registration = person.registrations.at(-1);
		const roster = person.roster.at(0);
		const email =
			registration?.email ||
			base?.email ||
			person.legacy.at(0)?.email ||
			roster?.N ||
			"";
		const phone = registration?.phone || base?.phone || roster?.O || "";
		return {
			sourceId: person.id,
			record: {
				kind: "memberProfiles",
				value: {
					personId: person.id,
					capNumber: Number(base?.cap_number || roster?.T) || undefined,
					email,
					phone,
					revision: 0,
					lastKey: `import:${person.id}`,
					lastPayload: "source migration",
					updatedAt: Date.parse(base?.updated_date || "2026-11-01T00:00:00Z"),
				},
			},
		};
	}),
);
await write(
	people.flatMap((person): Entry[] => {
		const member = migrationMember(person);
		if (member.ratingKnown === false) return [];
		const base = person.base.at(0);
		const positions = sourcePositions(
			sourceArray<string>(base?.positions).length
				? sourceArray<string>(base?.positions)
				: (person.legacy.at(0)?.positions ?? []),
		);
		return [
			{
				sourceId: person.id,
				record: {
					kind: "playerCoaching",
					value: {
						personId: person.id,
						rating: member.rating,
						positions,
						ageGroup: person.legacy.some((row) => row.youth)
							? "youth"
							: "adult",
						gender:
							base?.gender === "Male"
								? "male"
								: base?.gender === "Female"
									? "female"
									: undefined,
						revision: 0,
					},
				},
			},
		];
	}),
);
await write(
	people
		.filter((person) => person.registrations.length)
		.map(
			(person): Entry => ({
				sourceId: `${person.id}:2026-2027`,
				record: {
					kind: "seasonRecords",
					value: {
						personId: person.id,
						seasonId: "2026-2027",
						registration: "submitted",
						cuga: false,
						due: 0,
						paid: 0,
						revision: 0,
					},
				},
			}),
		),
);
await write(
	schedule.events.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "events", value: row.value },
		}),
	),
);
await write(
	schedule.responses.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "responses", value: row.value },
		}),
	),
);
const session = (
	programId: string,
	number: string,
): { id: string; date: string; title: string } | undefined => {
	const source = table("Session").find(
		(row) => row.program_id === programId && row.session_number === number,
	);
	return source
		? schedule.sourceEvents.get(`base44:Session:${source.id}`)
		: undefined;
};
const content = buildMigrationContent({
	tables,
	person: basePerson,
	author,
	session,
	program,
});
await write(
	content.feedback.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "feedback", value: row.value },
		}),
	),
);
await write(
	content.reviews.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "developmentReviews", value: row.value },
		}),
	),
);
await write(
	content.rounds.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "developmentRounds", value: row.value },
		}),
	),
);
await write(
	content.reflections.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "goalReflections", value: row.value },
		}),
	),
);
await write(
	content.checkins.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "sessionCheckins", value: row.value },
		}),
	),
);
await write([
	...content.performance.map(
		(row): Entry => ({
			sourceId: row.sourceId,
			record: { kind: "sessionPerformance", value: row.value },
		}),
	),
	...content.unlinked.flatMap((row): Entry[] =>
		row.table === "PlayerSessionFeedback"
			? [
					{
						sourceId: row.sourceId,
						record: {
							kind: "sessionPerformance",
							value: {
								...row.value,
								dateKind: "recorded",
								eventId: `source:base44:session:${row.sourceProgramId}:${row.sourceSessionNumber}`,
								eventTitle: `Session ${row.sourceSessionNumber}`,
								eventDate: sourceDate(row.value.updatedAt),
							},
						},
					},
				]
			: [],
	),
]);
await write(
	table("Session").flatMap((row): Entry[] => {
		const event = schedule.sourceEvents.get(`base44:Session:${row.id}`);
		if (!event) throw new Error("Session plan event unavailable.");
		return [
			{
				sourceId: `Session:${row.id}`,
				record: {
					kind: "sessionPlans",
					value: {
						key: event.id,
						eventId: event.id,
						body: row.theme || "",
						notes: [
							row.plan_summary && `Summary\n${row.plan_summary}`,
							row.plan && `Plan\n${row.plan}`,
							row.warmup && `Warmup\n${row.warmup}`,
							row.notes,
						]
							.filter(Boolean)
							.join("\n\n"),
						media: [],
						published: false,
						revision: 0,
						updatedAt: Date.parse(row.updated_date || row.created_date || ""),
						updatedBy: author("", row.created_by),
					},
				},
			},
		];
	}),
);
const coaches = await readLegacy<{ _id: string; playerId: string }>("coaches");
const coachHistory = await readLegacy<{
	_id: string;
	practiceId: string;
	coachId: string;
	durationMinutes: number;
}>("practiceCoaches");
await write(
	coachHistory.map((row): Entry => {
		const coach = coaches.find((entry) => entry._id === row.coachId);
		const event = schedule.sourceEvents.get(`legacy:${row.practiceId}`);
		const personId = coach ? legacyPerson(coach.playerId) : undefined;
		const person = people.find((entry) => entry.id === personId);
		if (!person || !event)
			throw new Error("Historical coaching dependency unavailable.");
		return {
			sourceId: `legacy:${row._id}`,
			record: {
				kind: "coachingHours",
				value: {
					coachId: importedActor(person.id),
					personId: person.id,
					name: person.name,
					eventId: event.id,
					durationMinutes: row.durationMinutes,
				},
			},
		};
	}),
);

type LegacyFitnessTest = { _id: string; name: string; unit: string };
type LegacyFitnessSession = {
	_id: string;
	fitnessTestId: string;
	date: number;
};
type LegacyFitnessResult = {
	_id: string;
	fitnessTestSessionId: string;
	playerId: string;
	value: string | number;
};
const legacyTests = await readLegacy<LegacyFitnessTest>("fitnessTests");
const legacySessions = await readLegacy<LegacyFitnessSession>(
	"fitnessTestSessions",
);
const legacyResults =
	await readLegacy<LegacyFitnessResult>("fitnessTestResults");
const baseTests = [
	...new Set(table("FitnessScore").map((row) => row.test_name ?? "")),
];
await write([
	...legacyTests.map(
		(test): Entry => ({
			sourceId: `legacy:${test._id}`,
			record: {
				kind: "fitnessTests",
				value: {
					name: test.name,
					unit: test.unit === "TIME" ? "time" : "count",
					lowerIsBetter: test.unit === "TIME",
					archived: false,
					revision: 0,
				},
			},
		}),
	),
	...baseTests.map(
		(name): Entry => ({
			sourceId: `base44:${name}`,
			record: {
				kind: "fitnessTests",
				value: {
					name,
					unit: "time",
					lowerIsBetter: true,
					archived: false,
					revision: 0,
				},
			},
		}),
	),
]);
const baseSessionKey = (row: SourceRow): string =>
	`base44:${row.test_name}:${row.session_date}:${row.program_id}`;
await write([
	...legacySessions.map(
		(row): Entry => ({
			sourceId: `legacy:${row._id}`,
			record: {
				kind: "fitnessSessions",
				value: {
					testId: importedId("fitnessTests", `legacy:${row.fitnessTestId}`),
					date: sourceDate(row.date),
					seasonId: seasonFor(sourceDate(row.date)),
					notes: "",
					resultCount: 0,
					revision: 0,
				},
			},
		}),
	),
	...[
		...new Map(
			table("FitnessScore").map((row) => [baseSessionKey(row), row]),
		).values(),
	].map(
		(row): Entry => ({
			sourceId: baseSessionKey(row),
			record: {
				kind: "fitnessSessions",
				value: {
					testId: importedId("fitnessTests", `base44:${row.test_name}`),
					date: row.session_date ?? "",
					seasonId: seasonFor(row.session_date ?? ""),
					notes: "",
					programId: program(row.program_id ?? ""),
					eventId: session(row.program_id ?? "", row.session_number ?? "")?.id,
					resultCount: 0,
					revision: 0,
				},
			},
		}),
	),
]);
const fitnessEntries: Entry[] = [
	...legacyResults.map((row): Entry => {
		const sourceSession = legacySessions.find(
			(entry) => entry._id === row.fitnessTestSessionId,
		);
		const test = legacyTests.find(
			(entry) => entry._id === sourceSession?.fitnessTestId,
		);
		if (!sourceSession || !test)
			throw new Error("Historical swim-test dependency unavailable.");
		const date = sourceDate(sourceSession.date);
		return {
			sourceId: `legacy:${row._id}`,
			record: {
				kind: "fitnessResults",
				value: {
					testId: importedId("fitnessTests", `legacy:${test._id}`),
					sessionId: importedId(
						"fitnessSessions",
						`legacy:${sourceSession._id}`,
					),
					personId: legacyPerson(row.playerId),
					date,
					seasonId: seasonFor(date),
					value: fitnessNumber(
						String(row.value),
						test.unit === "TIME" ? "time" : "count",
					),
					notes: "",
				},
			},
		};
	}),
	...table("FitnessScore").map(
		(row): Entry => ({
			sourceId: `FitnessScore:${row.id}`,
			record: {
				kind: "fitnessResults",
				value: {
					testId: importedId("fitnessTests", `base44:${row.test_name}`),
					sessionId: importedId("fitnessSessions", baseSessionKey(row)),
					personId: basePerson(row.player_id ?? ""),
					date: row.session_date ?? "",
					seasonId: seasonFor(row.session_date ?? ""),
					value: fitnessNumber(row.score ?? "", "time"),
					notes: row.notes ?? "",
				},
			},
		}),
	),
];
const fitnessKeys = new Set<string>();
for (const entry of fitnessEntries)
	if (entry.record.kind === "fitnessResults") {
		const key = `${entry.record.value.sessionId}:${entry.record.value.personId}`;
		if (fitnessKeys.has(key))
			throw new Error(
				"Duplicate merged-person result in one source test session needs review.",
			);
		fitnessKeys.add(key);
	}
await write(fitnessEntries);
for (const sourceId of [
	...legacyTests.map((row) => `legacy:${row._id}`),
	...baseTests.map((name) => `base44:${name}`),
])
	await run("local_migration:rebuildFitness", {
		testId: importedId("fitnessTests", sourceId),
	});

const mediaDirectory = resolve(migrationRoot, "downloaded-assets");
await mkdir(mediaDirectory, { recursive: true, mode: 0o700 });
const mediaHosts = new Set([
	"base44.app",
	"media.base44.com",
	"img.youtube.com",
]);
const capture = async (
	value: string,
): Promise<{ path: string; mime: string }> => {
	const url = new URL(value);
	if (url.protocol !== "https:" || !mediaHosts.has(url.hostname))
		throw new Error("Source media host requires review.");
	const path = resolve(mediaDirectory, fingerprint(value));
	if (await Bun.file(path).exists())
		return { path, mime: (await Bun.file(`${path}.mime`).text()).trim() };
	const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
	if (!response.ok || !mediaHosts.has(new URL(response.url).hostname))
		throw new Error("Source media could not be copied safely.");
	const mime =
		response.headers.get("content-type")?.split(";").at(0) ||
		"application/octet-stream";
	await Bun.write(path, response);
	await Bun.write(`${path}.mime`, mime);
	return { path, mime };
};
const upload = async (
	sourceId: string,
	path: string,
	mime: string,
	purpose: "video" | "thumbnail" | "document" | "voice",
): Promise<Id<"resourceFiles">> => {
	if (destination.has(`resourceFiles:${sourceId}`))
		return importedId("resourceFiles", sourceId);
	const url = await run<string>("local_migration:mediaUpload", {});
	const file = Bun.file(path);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": mime },
		body: file,
	});
	if (!response.ok)
		throw new Error(`Local media upload failed: HTTP ${response.status}`);
	const result: { storageId: Id<"_storage"> } = await response.json();
	await write([
		{
			sourceId,
			record: {
				kind: "resourceFiles",
				value: {
					ownerId: status.ownerId,
					storageId: result.storageId,
					name: sourceId.replace(/[^a-z0-9_-]/gi, "_"),
					mime,
					size: file.size,
					purpose,
				},
			},
		},
	]);
	return importedId("resourceFiles", sourceId);
};
for (const row of table("VideoClip")) {
	const voice = row.voice_note_url
		? await capture(row.voice_note_url)
		: undefined;
	const voiceFileId = voice
		? await upload(`VideoClip:${row.id}:voice`, voice.path, voice.mime, "voice")
		: undefined;
	const videoUrl = row.video_url || "";
	const localFile = resolve(migrationRoot, "base44-media", `${row.id}.video`);
	const fileId = (await Bun.file(localFile).exists())
		? await upload(`VideoClip:${row.id}:video`, localFile, "video/mp4", "video")
		: undefined;
	const thumbnail = row.thumbnail_url
		? await capture(row.thumbnail_url)
		: undefined;
	const thumbnailFileId = thumbnail
		? await upload(
				`VideoClip:${row.id}:thumbnail`,
				thumbnail.path,
				thumbnail.mime,
				"thumbnail",
			)
		: undefined;
	await write([
		{
			sourceId: `VideoClip:${row.id}`,
			record: {
				kind: "resources",
				value: {
					key: `base44:video:${row.id}`,
					title: row.title || "Coaching clip",
					description: row.text_note || "",
					kind: "video",
					audience: "players",
					personIds: [basePerson(row.player_id || "")],
					programIds: [program(row.program_id || "")],
					url: fileId ? undefined : videoUrl,
					fileId,
					thumbnailFileId,
					voiceFileId,
					voiceTranscript: row.voice_transcript || undefined,
					sessionNumber: row.session_number
						? Number(row.session_number)
						: undefined,
					archived: false,
					revision: 0,
					updatedAt: Date.parse(row.updated_date || row.created_date || ""),
					authorId: author("", row.created_by),
				},
			},
		},
	]);
}
for (const row of table("TeamDoc")) {
	const file = await capture(row.file_url || "");
	const fileId = await upload(
		`TeamDoc:${row.id}:file`,
		file.path,
		file.mime,
		"document",
	);
	await write([
		{
			sourceId: `TeamDoc:${row.id}`,
			record: {
				kind: "resources",
				value: {
					key: `base44:document:${row.id}`,
					title: row.title || row.file_name || "Club document",
					description: row.description || "",
					kind: "document",
					category: "formations",
					audience: row.is_club_wide === "true" ? "club" : "programs",
					personIds: [],
					programIds: [program(row.program_id || "")],
					fileId,
					archived: false,
					revision: 0,
					updatedAt: Date.parse(row.updated_date || row.created_date || ""),
					authorId: author("", row.created_by),
				},
			},
		},
	]);
}

const legacyArchive = await Promise.all(
	(await readdir(resolve(migrationRoot, "legacy")))
		.filter((file) => file.endsWith(".json"))
		.map(async (file) => {
			const rows: { _id: string; [key: string]: unknown }[] = await Bun.file(
				resolve(migrationRoot, "legacy", file),
			).json();
			return rows.map((row) => ({
				key: `legacy:${file}:${row._id}`,
				source: "legacy",
				entity: file.replace(/\.json$/, ""),
				payload: JSON.stringify(
					Object.fromEntries(
						Object.entries(row).filter(
							([key]) => !["birth_date", "birthDate"].includes(key),
						),
					),
				),
				disposition:
					file === "practiceAttendance.json" &&
					!schedule.sourceEvents.has(`legacy:${row.practiceId}`)
						? "source practice missing; preserved without a fabricated date or attendance record"
						: "historical source retained alongside normalized records",
			}));
		}),
);
const sourceArchive = [
	...legacyArchive.flat(),
	...roster.map((row) => ({
		key: `sporteasy:member:${row._sporteasyId}`,
		source: "sporteasy",
		entity: "Member",
		payload: JSON.stringify({
			id: row._sporteasyId,
			firstName: row.B,
			lastName: row.A,
			nickname: row.C,
			email: row.N,
			phone: row.O,
			cap: row.T,
			position: row.V,
		}),
		disposition:
			"contact and roster source; no account roles or family access granted",
	})),
	...presence.slice(2).map((row, index) => ({
		key: `sporteasy:presence:${index}`,
		source: "sporteasy",
		entity: "Presence",
		payload: JSON.stringify({
			row,
			eventColumns: columnSource.columns.slice(0, 24),
		}),
		disposition: "observed attendance retained separately from RSVP intent",
	})),
	...calendar.map((row) => ({
		key: `sporteasy:calendar:${row.uid}`,
		source: "sporteasy",
		entity: "CalendarEvent",
		payload: JSON.stringify(row),
		disposition: "canonical SportEasy schedule source",
	})),
	...Object.entries(tables).flatMap(([entity, rows]) =>
		rows.map((row) => ({
			key: `base44:${entity}:${row.id}`,
			source: "base44",
			entity,
			payload: JSON.stringify(
				Object.fromEntries(
					Object.entries(row).filter(([key]) => key !== "birth_date"),
				),
			),
			disposition: [
				"TermsAcceptance",
				"CoachSchedule",
				"Interview",
				"InterviewAvailability",
				"GoalChangeRequest",
			].includes(entity)
				? "private historical source; no present-day consent or access granted"
				: "source retained alongside normalized records",
		})),
	),
	...registrations.map((row, index) => ({
		key: `registration:${index}`,
		source: "registration",
		entity: "Registration",
		payload: JSON.stringify(row),
		disposition: "submitted; not payment or terms evidence",
	})),
];
for (const offset of Array.from(
	{ length: Math.ceil(sourceArchive.length / 40) },
	(_, index) => index * 40,
))
	await run("local_migration:archive", {
		dryRun: false,
		entries: sourceArchive
			.slice(offset, offset + 40)
			.map((row) => ({ ...row, fingerprint: fingerprint(row.payload) })),
	});
const final = await run<Status>("local_migration:status", {});
await Bun.write(
	resolve(migrationRoot, "import-result.json"),
	JSON.stringify(
		{
			completedAt: new Date().toISOString(),
			clubId: final.clubId,
			counts: final.counts,
			archived: final.archived,
			schedule: schedule.summary,
			sourcePeople: people.length,
			registered: registrations.length,
			deliveryDisabled: final.deliveryDisabled,
		},
		null,
		2,
	),
);
console.log(
	JSON.stringify({
		counts: final.counts,
		archived: final.archived,
		deliveryDisabled: final.deliveryDisabled,
	}),
);
