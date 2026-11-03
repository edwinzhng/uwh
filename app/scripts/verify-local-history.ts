import { createHash } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type ExportDocument = Record<string, Json>;
export type ExportSnapshot = {
	tables: Readonly<Record<string, readonly ExportDocument[]>>;
	storage: readonly { id: string; path: string; size: number }[];
};
type Issue = { code: string; table: string; id: string; fields?: string[] };
type Difference = Issue & { beforeHash?: string; afterHash?: string };
const object = (value: Json | undefined): ExportDocument =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? value
		: {};
const string = (value: Json | undefined): string =>
	typeof value === "string" ? value : "";
const array = (value: Json | undefined): Json[] =>
	Array.isArray(value) ? value : [];
const rows = (
	snapshot: ExportSnapshot,
	table: string,
): readonly ExportDocument[] => snapshot.tables[table] ?? [];
const value = (row: ExportDocument): ExportDocument =>
	row.value !== null &&
	typeof row.value === "object" &&
	!Array.isArray(row.value)
		? row.value
		: row;
const id = (row: ExportDocument): string => {
	const candidate = row._id ?? row.id;
	return typeof candidate === "number" ? String(candidate) : string(candidate);
};
const canonical = (value: Json): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object")
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key] ?? null)}`)
			.join(",")}}`;
	return JSON.stringify(value);
};
const digest = (row: ExportDocument): string =>
	createHash("sha256").update(canonical(row)).digest("hex");
const changedFields = (
	before: ExportDocument,
	after: ExportDocument,
): string[] =>
	[...new Set([...Object.keys(before), ...Object.keys(after)])]
		.filter(
			(key) => canonical(before[key] ?? null) !== canonical(after[key] ?? null),
		)
		.sort();
const validDate = (candidate: Json | undefined): boolean =>
	typeof candidate === "string" &&
	/^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
	Number.isFinite(Date.parse(`${candidate}T00:00:00Z`)) &&
	new Date(`${candidate}T00:00:00Z`).toISOString().slice(0, 10) === candidate;

export const auditLocalHistory = (
	before: ExportSnapshot,
	after: ExportSnapshot,
	ownerEmail = "edwinzhang64@gmail.com",
	approvals: { enableOwnerCoaching?: boolean } = {},
): {
	status: "pass" | "fail" | "review_required";
	counts: Record<string, { before: number; after: number; target: number }>;
	issues: Issue[];
	outsideDifferences: Difference[];
	approvedDifferences: Difference[];
	metadataDifferences: Difference[];
	newGlobalDocuments: Issue[];
	referenceCounts: Record<string, number>;
	media: {
		videos: number;
		storedVideos: number;
		externalVideos: number;
		files: number;
	};
} => {
	const issues: Issue[] = [];
	const outsideDifferences: Difference[] = [];
	const approvedDifferences: Difference[] = [];
	const metadataDifferences: Difference[] = [];
	const newGlobalDocuments: Issue[] = [];
	const issue = (
		code: string,
		table: string,
		row: ExportDocument,
		fields?: string[],
	): void => {
		issues.push({ code, table, id: id(row), ...(fields ? { fields } : {}) });
	};
	const owners = rows(after, "users").filter((row) => row.email === ownerEmail);
	const owner = owners.at(0);
	const memberships = rows(after, "memberships").filter(
		(row) => row.userId === owner?._id,
	);
	const membership = memberships.at(0);
	const clubId = string(membership?.clubId);
	const club = rows(after, "clubs").find((row) => row._id === clubId);
	if (
		owners.length !== 1 ||
		memberships.length !== 1 ||
		membership?.personId !== "edwin" ||
		membership.admin !== true ||
		club?.ownerId !== owner?._id ||
		!clubId
	)
		issue("invalid_destination_identity", "memberships", membership ?? {});
	const target = (table: string): readonly ExportDocument[] =>
		rows(after, table).filter((row) => !!clubId && row.clubId === clubId);
	const tables = [
		...new Set([...Object.keys(before.tables), ...Object.keys(after.tables)]),
	].sort();
	const counts = Object.fromEntries(
		tables.map((table) => [
			table,
			{
				before: rows(before, table).length,
				after: rows(after, table).length,
				target: target(table).length,
			},
		]),
	);
	const metadataTables = new Set([
		"authSessions",
		"authRefreshTokens",
		"authVerificationCodes",
		"authVerifiers",
		"authRateLimits",
		"conversationReads",
		"messageReads",
		"notificationReads",
	]);
	const protectedTables = new Set([
		"users",
		"memberships",
		"authAccounts",
		"accountConnections",
		"clubInvites",
		"joinRequests",
		"invitations",
		"guardianInvites",
	]);
	const approvedOwnerCoaching = (
		table: string,
		previous: ExportDocument,
		updated: ExportDocument | undefined,
	): boolean => {
		const programIds = array(club?.programs).map((program) =>
			string(object(program).id),
		);
		const coachPrograms = array(updated?.coachPrograms);
		return (
			approvals.enableOwnerCoaching === true &&
			table === "memberships" &&
			previous._id === membership?._id &&
			previous.userId === owner?._id &&
			previous.clubId === clubId &&
			previous.personId === "edwin" &&
			previous.admin === true &&
			Array.isArray(previous.coachPrograms) &&
			previous.coachPrograms.length === 0 &&
			!!updated &&
			canonical(changedFields(previous, updated)) ===
				canonical(["coachPrograms"]) &&
			programIds.length === 6 &&
			programIds.every(Boolean) &&
			new Set(programIds).size === 6 &&
			coachPrograms.length === 6 &&
			coachPrograms.every((program) => typeof program === "string") &&
			canonical([...coachPrograms].sort()) === canonical([...programIds].sort())
		);
	};
	for (const table of tables) {
		const previous = new Map(rows(before, table).map((row) => [id(row), row]));
		const next = new Map(rows(after, table).map((row) => [id(row), row]));
		for (const row of rows(before, table)) {
			const updated = next.get(id(row));
			const isTarget =
				!protectedTables.has(table) &&
				!!clubId &&
				(row.clubId === clubId || (table === "clubs" && row._id === clubId));
			if (isTarget || (updated && canonical(row) === canonical(updated)))
				continue;
			const difference: Difference = {
				code: updated ? "preexisting_changed" : "preexisting_deleted",
				table,
				id: id(row),
				beforeHash: digest(row),
				...(updated
					? { afterHash: digest(updated), fields: changedFields(row, updated) }
					: {}),
			};
			if (approvedOwnerCoaching(table, row, updated))
				approvedDifferences.push({
					...difference,
					code: "approved_owner_coaching_assignment",
				});
			else if (metadataTables.has(table)) metadataDifferences.push(difference);
			else outsideDifferences.push(difference);
		}
		for (const row of rows(after, table)) {
			if (previous.has(id(row))) continue;
			if (protectedTables.has(table) && table !== "users")
				issue("unexpected_new_access_record", table, row);
			if (row.clubId === clubId || table === "_storage" || table === "_tables")
				continue;
			if (table === "users") continue;
			newGlobalDocuments.push({
				code: "new_global_document",
				table,
				id: id(row),
			});
		}
		const seen = new Set<string>();
		for (const row of rows(after, table)) {
			if (!id(row) || seen.has(id(row)))
				issue("duplicate_or_missing_document_id", table, row);
			seen.add(id(row));
		}
	}
	const users = new Set(rows(after, "users").map(id));
	const referenceCounts: Record<string, number> = {};
	const actorIds = new Set<string>();
	for (const row of target("migrationReferences")) {
		const kind = string(row.kind);
		referenceCounts[kind] = (referenceCounts[kind] ?? 0) + 1;
		const destinationTable =
			kind === "actors" ? "users" : kind === "configuration" ? "clubs" : kind;
		const destination = rows(after, destinationTable).find(
			(candidate) => candidate._id === row.targetId,
		);
		if (
			!destination ||
			(destinationTable !== "users" &&
				destinationTable !== "clubs" &&
				destination.clubId !== clubId) ||
			(destinationTable === "clubs" && destination._id !== clubId)
		)
			issue(
				"dangling_or_cross_club_migration_reference",
				"migrationReferences",
				row,
			);
		if (kind === "actors") actorIds.add(string(row.targetId));
	}
	const beforeUsers = new Set(rows(before, "users").map(id));
	for (const row of rows(after, "users")) {
		if (beforeUsers.has(id(row))) continue;
		if (
			!actorIds.has(id(row)) ||
			Object.keys(row).some(
				(key) => !["_id", "_creationTime", "name"].includes(key),
			)
		)
			issue("new_user_not_inert_import_actor", "users", row);
		for (const table of [
			"authAccounts",
			"memberships",
			"authSessions",
			"accountConnections",
		])
			if (rows(after, table).some((record) => record.userId === row._id))
				issue("import_actor_has_access", "users", row);
	}
	const keys = (table: string, field = "id"): Set<string> =>
		new Set(target(table).map((row) => string(value(row)[field])));
	const people = keys("members");
	const events = keys("events");
	const resources = new Set(target("resources").map(id));
	const programs = new Set([
		"club",
		...array(club?.programs).map((entry) => string(object(entry).id)),
	]);
	const seasons = new Set(
		array(club?.seasons).map((entry) => string(object(entry).id)),
	);
	const reference = (
		table: string,
		row: ExportDocument,
		field: string,
		allowed: ReadonlySet<string>,
		optional = false,
	): void => {
		const candidate = value(row)[field];
		if (optional && candidate === undefined) return;
		if (typeof candidate !== "string" || !allowed.has(candidate))
			issue("invalid_foreign_key", table, row, [field]);
	};
	const listReferences = (
		table: string,
		row: ExportDocument,
		field: string,
		allowed: ReadonlySet<string>,
	): void => {
		if (
			array(value(row)[field]).some(
				(entry) => typeof entry !== "string" || !allowed.has(entry),
			)
		)
			issue("invalid_foreign_key_array", table, row, [field]);
	};
	const domain = (
		table: string,
		row: ExportDocument,
		field: string,
		allowed: readonly Json[],
		optional = false,
	): void => {
		const candidate = value(row)[field];
		if (
			!(optional && candidate === undefined) &&
			!allowed.includes(candidate ?? null)
		)
			issue("invalid_domain", table, row, [field]);
	};
	const number = (
		table: string,
		row: ExportDocument,
		field: string,
		min: number,
		max: number,
		optional = false,
	): void => {
		const candidate = value(row)[field];
		if (optional && candidate === undefined) return;
		if (
			typeof candidate !== "number" ||
			!Number.isFinite(candidate) ||
			candidate < min ||
			candidate > max
		)
			issue("invalid_number", table, row, [field]);
	};
	const unique = (table: string, fields: readonly string[]): void => {
		const seen = new Set<string>();
		for (const row of target(table)) {
			const key = JSON.stringify(
				fields.map((field) => value(row)[field] ?? null),
			);
			if (seen.has(key)) issue("duplicate_domain_key", table, row, [...fields]);
			seen.add(key);
		}
	};
	for (const table of [
		"members",
		"events",
		"responses",
		"feedback",
		"teams",
		"messages",
		"conversations",
		"notices",
	])
		unique(table, ["id"]);
	for (const [table, fields] of Object.entries({
		memberProfiles: ["personId"],
		playerCoaching: ["personId"],
		responses: ["eventId", "personId"],
		seasonRecords: ["seasonId", "personId"],
		developmentRounds: ["personId", "round"],
		developmentReviews: ["personId", "round", "coachId"],
		goalReflections: ["authorId", "requestId"],
		sessionPerformance: ["personId", "eventId", "kind", "authorKey"],
		sessionCheckins: ["personId", "eventId"],
		fitnessResults: ["sessionId", "personId"],
		fitnessStats: ["testId", "seasonId", "personId"],
		sessionPlans: ["key"],
		resources: ["key"],
		migrationReferences: ["key"],
		migrationArchive: ["key"],
	}))
		unique(table, fields);
	for (const table of [
		"memberProfiles",
		"playerCoaching",
		"responses",
		"feedback",
		"seasonRecords",
		"developmentReviews",
		"developmentRounds",
		"goalReflections",
		"sessionPerformance",
		"sessionCheckins",
		"coachingHours",
		"fitnessResults",
		"fitnessStats",
	])
		for (const row of target(table)) reference(table, row, "personId", people);
	for (const table of [
		"responses",
		"teams",
		"sessionCheckins",
		"sessionPlans",
		"coachingHours",
	])
		for (const row of target(table)) reference(table, row, "eventId", events);
	for (const [table, field] of Object.entries({
		feedback: "authorId",
		goalReflections: "authorId",
		sessionPerformance: "authorId",
		sessionCheckins: "actorId",
		developmentReviews: "coachId",
		coachingHours: "coachId",
		resourceComments: "authorId",
	}))
		for (const row of target(table)) reference(table, row, field, users);
	for (const [table, field] of Object.entries({
		resources: "authorId",
		resourceFiles: "ownerId",
		sessionPlans: "updatedBy",
		memberProfiles: "lastActorId",
	}))
		for (const row of target(table)) reference(table, row, field, users, true);
	for (const row of target("members")) {
		listReferences("members", row, "programs", programs);
		number("members", row, "rating", 0, 100);
		if (value(row).ratingKnown === false && value(row).rating !== 0)
			issue("unknown_rating_has_value", "members", row);
		domain("members", row, "registration", [
			"missing",
			"submitted",
			"approved",
		]);
	}
	for (const row of target("playerCoaching")) {
		number("playerCoaching", row, "rating", 0, 100);
		if (row.ratingKnown === false && row.rating !== 0)
			issue("unknown_rating_has_value", "playerCoaching", row);
		domain("playerCoaching", row, "ageGroup", ["adult", "youth"]);
		if (
			array(row.positions).some(
				(position) =>
					!["FORWARD", "WING", "CENTER", "FULL_BACK"].includes(
						string(position),
					),
			)
		)
			issue("invalid_domain", "playerCoaching", row, ["positions"]);
	}
	for (const row of target("events")) {
		reference("events", row, "program", programs);
		reference("events", row, "seasonId", seasons, true);
		if (!validDate(value(row).date))
			issue("invalid_date", "events", row, ["date"]);
		domain("events", row, "kind", [
			"training",
			"hockey",
			"social",
			"meeting",
			"tournament",
		]);
		domain("events", row, "signup", ["open", "scheduled", "closed"]);
		listReferences("events", row, "eligiblePersonIds", people);
	}
	for (const row of target("responses")) {
		domain("responses", row, "response", [
			"going",
			"unavailable",
			"unanswered",
			"waiting",
		]);
		domain("responses", row, "attendance", [
			"unmarked",
			"present",
			"late",
			"absent",
		]);
		const event = target("events").find(
			(event) => value(event).id === value(row).eventId,
		);
		const parts = new Set(
			array(value(event ?? {}).parts).map((entry) => string(object(entry).id)),
		);
		listReferences("responses", row, "partIds", parts);
		for (const entry of array(value(row).partAttendance))
			if (
				!parts.has(string(object(entry).partId)) ||
				!["unmarked", "present", "late", "absent"].includes(
					string(object(entry).attendance),
				)
			)
				issue("invalid_part_attendance", "responses", row);
	}
	for (const row of target("teams")) {
		for (const field of [
			"black",
			"white",
			"attendees",
			"blackBench",
			"whiteBench",
			"excludedPersonIds",
		])
			listReferences("teams", row, field, people);
		for (const field of [
			"assignments",
			"fieldSlots",
			"rotationSlots",
			"referees",
		])
			if (
				array(value(row)[field]).some(
					(entry) => !people.has(string(object(entry).personId)),
				)
			)
				issue("invalid_lineup_person", "teams", row, [field]);
		const sides = [...array(value(row).black), ...array(value(row).white)];
		if (new Set(sides).size !== sides.length)
			issue("duplicate_lineup_player", "teams", row);
	}
	for (const row of target("feedback")) {
		reference("feedback", row, "eventId", events, true);
		domain(
			"feedback",
			row,
			"category",
			["mvp", "above_usual", "stood_out", "great_session"],
			true,
		);
		domain("feedback", row, "visibility", ["draft", "published", "private"]);
		domain("feedback", row, "kind", ["coaching", "shoutout"], true);
	}
	for (const row of target("developmentRounds")) {
		listReferences("developmentRounds", row, "requiredCoachIds", users);
		domain("developmentRounds", row, "status", [
			"open",
			"finalized",
			"superseded",
		]);
	}
	for (const row of target("developmentReviews")) {
		domain("developmentReviews", row, "status", ["draft", "submitted"]);
		number("developmentReviews", row, "rating", 0, 100, true);
		if (
			!target("developmentRounds").some(
				(round) => round.personId === row.personId && round.round === row.round,
			)
		)
			issue("missing_development_round", "developmentReviews", row);
	}
	for (const row of target("goalReflections")) {
		number("goalReflections", row, "selfRating", 1, 5);
		number("goalReflections", row, "checkIn", 1, 6);
	}
	for (const row of target("sessionPerformance")) {
		if (row.dateKind !== "recorded")
			reference("sessionPerformance", row, "eventId", events);
		domain("sessionPerformance", row, "dateKind", ["recorded"], true);
		domain("sessionPerformance", row, "kind", ["self", "coach"]);
		number("sessionPerformance", row, "rating", 1, 10);
		reference("sessionPerformance", row, "programId", programs);
		if (!validDate(row.eventDate))
			issue("invalid_date", "sessionPerformance", row, ["eventDate"]);
	}
	for (const row of target("sessionCheckins"))
		number("sessionCheckins", row, "energy", 1, 5);
	for (const row of target("coachingHours"))
		number("coachingHours", row, "durationMinutes", 0, Number.MAX_SAFE_INTEGER);
	for (const row of target("seasonRecords"))
		reference("seasonRecords", row, "seasonId", seasons);
	const tests = new Map(target("fitnessTests").map((row) => [id(row), row]));
	const sessions = new Map(
		target("fitnessSessions").map((row) => [id(row), row]),
	);
	for (const row of target("fitnessTests"))
		domain("fitnessTests", row, "unit", [
			"time",
			"distance",
			"count",
			"pass_fail",
		]);
	for (const table of ["fitnessSessions", "fitnessResults", "fitnessStats"])
		for (const row of target(table)) {
			reference(table, row, "testId", new Set(tests.keys()));
			reference(table, row, "seasonId", seasons);
		}
	for (const row of target("fitnessSessions")) {
		reference("fitnessSessions", row, "eventId", events, true);
		reference("fitnessSessions", row, "programId", programs, true);
		const count = target("fitnessResults").filter(
			(result) => result.sessionId === row._id,
		).length;
		if (row.resultCount !== count)
			issue("fitness_session_count_mismatch", "fitnessSessions", row);
	}
	for (const row of target("fitnessResults")) {
		reference("fitnessResults", row, "sessionId", new Set(sessions.keys()));
		const session = sessions.get(string(row.sessionId));
		if (
			session &&
			["testId", "seasonId", "date"].some(
				(field) => row[field] !== session[field],
			)
		)
			issue("fitness_session_identity_mismatch", "fitnessResults", row);
		number("fitnessResults", row, "value", 0, Number.MAX_SAFE_INTEGER);
	}
	for (const row of target("fitnessStats")) {
		const results = target("fitnessResults").filter((result) =>
			["testId", "seasonId", "personId"].every(
				(field) => result[field] === row[field],
			),
		);
		const values = results.map((result) =>
			typeof result.value === "number" ? result.value : Number.NaN,
		);
		const test = tests.get(string(row.testId));
		const lower = test?.lowerIsBetter ?? test?.unit === "time";
		const best = lower ? Math.min(...values) : Math.max(...values);
		const total = values.reduce((sum, candidate) => sum + candidate, 0);
		if (
			row.count !== values.length ||
			typeof row.total !== "number" ||
			Math.abs(row.total - total) > 0.000001 ||
			typeof row.best !== "number" ||
			Math.abs(row.best - best) > 0.000001 ||
			!values.length
		)
			issue("fitness_stats_mismatch", "fitnessStats", row);
	}
	for (const result of target("fitnessResults"))
		if (
			!target("fitnessStats").some((stat) =>
				["testId", "seasonId", "personId"].every(
					(field) => stat[field] === result[field],
				),
			)
		)
			issue("missing_fitness_stats", "fitnessResults", result);
	const files = new Map(target("resourceFiles").map((row) => [id(row), row]));
	const storage = new Map(rows(after, "_storage").map((row) => [id(row), row]));
	const binaries = new Map(after.storage.map((entry) => [entry.id, entry]));
	for (const table of ["resourceFiles", "memberProfilePhotos"])
		for (const row of target(table)) {
			const metadata = storage.get(string(row.storageId));
			const binary = binaries.get(string(row.storageId));
			if (!metadata || !binary) issue("missing_storage_file", table, row);
			else if (
				binary.size !== row.size ||
				metadata.size !== row.size ||
				binary.size <= 0
			)
				issue("storage_size_mismatch", table, row);
		}
	for (const row of target("resourceFiles"))
		reference("resourceFiles", row, "resourceId", resources, true);
	for (const row of target("resources")) {
		domain("resources", row, "kind", ["video", "document"]);
		listReferences("resources", row, "personIds", people);
		listReferences("resources", row, "programIds", programs);
		for (const [field, purpose] of [
			["fileId", row.kind],
			["thumbnailFileId", "thumbnail"],
			["voiceFileId", "voice"],
		]) {
			const fileId = row[string(field)];
			if (fileId === undefined) continue;
			const file = files.get(string(fileId));
			if (!file || (file.purpose !== undefined && file.purpose !== purpose))
				issue("invalid_resource_file_slot", "resources", row, [string(field)]);
			else if (file.resourceId !== id(row))
				issue("resource_file_ownership_mismatch", "resources", row, [
					string(field),
				]);
		}
		if (row.kind === "video" && !row.fileId && !row.url)
			issue("video_without_playable_source", "resources", row);
	}
	for (const row of target("resourceComments"))
		reference("resourceComments", row, "resourceId", resources);
	for (const row of target("sessionPlans"))
		for (const drill of array(row.drills))
			for (const media of array(object(drill).media))
				if (
					object(media).source === "resource" &&
					!resources.has(string(object(media).resourceId))
				)
					issue("invalid_plan_resource", "sessionPlans", row);
	const conversations = keys("conversations");
	const messages = keys("messages");
	for (const row of target("conversations")) {
		reference("conversations", row, "eventId", events, true);
		listReferences("conversations", row, "participantPersonIds", people);
	}
	for (const row of target("messages")) {
		reference("messages", row, "threadId", conversations);
		reference("messages", row, "replyToId", messages, true);
	}
	const videos = target("resources").filter((row) => row.kind === "video");
	return {
		status:
			issues.length || outsideDifferences.length
				? "fail"
				: metadataDifferences.length || newGlobalDocuments.length
					? "review_required"
					: "pass",
		counts,
		issues,
		outsideDifferences,
		approvedDifferences,
		metadataDifferences,
		newGlobalDocuments,
		referenceCounts,
		media: {
			videos: videos.length,
			storedVideos: videos.filter((row) => !!row.fileId).length,
			externalVideos: videos.filter((row) => !row.fileId && !!row.url).length,
			files: files.size,
		},
	};
};

const unzip = async (args: string[]): Promise<string> => {
	const process = Bun.spawn(["unzip", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [output, , code] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (code !== 0)
		throw new Error("Unable to read or validate the migration export ZIP.");
	return output;
};
const parseDocuments = (source: string): ExportDocument[] => {
	try {
		return source
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => {
				const parsed: Json = JSON.parse(line);
				if (
					parsed === null ||
					typeof parsed !== "object" ||
					Array.isArray(parsed) ||
					(typeof parsed._id !== "string" &&
						typeof parsed.id !== "number" &&
						typeof parsed.id !== "string")
				)
					throw new Error("Invalid document");
				return parsed;
			});
	} catch {
		throw new Error(
			"The export contains invalid document JSONL; private row contents were not printed.",
		);
	}
};
export const readExportSnapshot = async (
	path: string,
): Promise<ExportSnapshot> => {
	await unzip(["-t", path]);
	const listing = await unzip(["-l", path]);
	const entries = (await unzip(["-Z1", path])).split("\n").filter(Boolean);
	if (new Set(entries).size !== entries.length)
		throw new Error("Duplicate ZIP entry paths require review.");
	const tables: Record<string, ExportDocument[]> = {};
	for (const entry of entries.filter((entry) =>
		/^[^/]+\/documents\.jsonl$/.test(entry),
	)) {
		const table = entry.split("/").at(0);
		if (table) tables[table] = parseDocuments(await unzip(["-p", path, entry]));
	}
	const storage = listing.split("\n").flatMap((line) => {
		const match = line.match(
			/^\s*(\d+)\s+\S+\s+\S+\s+(_storage\/([^/.]+)(?:\.[^/]+)?)\s*$/,
		);
		const size = match?.at(1);
		const filePath = match?.at(2);
		const storageId = match?.at(3);
		return size && filePath && storageId && !filePath.endsWith(".jsonl")
			? [{ id: storageId, path: filePath, size: Number(size) }]
			: [];
	});
	return { tables, storage };
};

if (import.meta.main) {
	const directory = resolve(import.meta.dir, "../../data/migration-2026-11-01");
	const beforePath = resolve(
		Bun.argv.at(2) ?? `${directory}/destination-before-health-import.zip`,
	);
	const afterPath = resolve(
		Bun.argv.at(3) ?? `${directory}/destination-after-health-import.zip`,
	);
	const reportPath = resolve(
		Bun.argv.at(4) ?? `${directory}/post-import-audit.json`,
	);
	const approvalFile = Bun.file(`${directory}/approvals.json`);
	const approvalValues: Json = (await approvalFile.exists())
		? await approvalFile.json()
		: {};
	const report = auditLocalHistory(
		await readExportSnapshot(beforePath),
		await readExportSnapshot(afterPath),
		"edwinzhang64@gmail.com",
		{
			enableOwnerCoaching: object(approvalValues).enableOwnerCoaching === true,
		},
	);
	await mkdir(dirname(reportPath), { recursive: true, mode: 0o700 });
	await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
		mode: 0o600,
	});
	await chmod(reportPath, 0o600);
	console.log(
		JSON.stringify({
			status: report.status,
			issues: report.issues.length,
			outsideDifferences: report.outsideDifferences.length,
			approvedDifferences: report.approvedDifferences.length,
			metadataDifferences: report.metadataDifferences.length,
			newGlobalDocuments: report.newGlobalDocuments.length,
			counts: report.counts,
			referenceCounts: report.referenceCounts,
			media: report.media,
		}),
	);
	if (report.status !== "pass")
		process.exitCode = report.status === "fail" ? 1 : 2;
}
