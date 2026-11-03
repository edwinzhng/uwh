import { expect, test } from "bun:test";
import {
	auditLocalHistory,
	type ExportDocument,
	type ExportSnapshot,
} from "./verify-local-history";

const baseline = (): ExportSnapshot => ({
	tables: {
		users: [
			{ _id: "owner", email: "fixture@example.com" },
			{ _id: "other-user", name: "Other" },
		],
		memberships: [
			{
				_id: "owner-access",
				userId: "owner",
				clubId: "target",
				admin: true,
				personId: "edwin",
			},
		],
		clubs: [
			{
				_id: "target",
				ownerId: "owner",
				programs: [],
				seasons: [{ id: "season" }],
			},
			{ _id: "other", ownerId: "other-user" },
		],
		members: [
			{
				_id: "person",
				clubId: "target",
				value: {
					id: "edwin",
					rating: 0,
					ratingKnown: false,
					programs: ["club"],
					registration: "missing",
				},
			},
			{
				_id: "other-person",
				clubId: "other",
				value: { id: "other-person", name: "Untouched" },
			},
		],
	},
	storage: [],
});
const add = (
	snapshot: ExportSnapshot,
	table: string,
	...documents: ExportDocument[]
): ExportSnapshot => ({
	...snapshot,
	tables: {
		...snapshot.tables,
		[table]: [...(snapshot.tables[table] ?? []), ...documents],
	},
});
const audit = (
	before: ExportSnapshot,
	after: ExportSnapshot,
): ReturnType<typeof auditLocalHistory> =>
	auditLocalHistory(before, after, "fixture@example.com");

test("unchanged snapshots pass without migration-reference-based count inflation", (): void => {
	const before = baseline();
	const after = add(before, "migrationReferences", {
		_id: "reference",
		clubId: "target",
		kind: "members",
		key: "member:one",
		targetId: "person",
	});
	const report = audit(before, after);
	expect(report.status).toBe("pass");
	expect(report.counts.members?.target).toBe(1);
	expect(report.referenceCounts.members).toBe(1);
});

test("Convex table catalogs use numeric IDs and do not create false document collisions", (): void => {
	const snapshot = add(
		baseline(),
		"_tables",
		{ id: 1, name: "members" },
		{ id: 2, name: "clubs" },
	);
	expect(audit(snapshot, snapshot).status).toBe("pass");
});

test("preexisting unrelated records and target owner grants cannot be changed", (): void => {
	const before = baseline();
	const after: ExportSnapshot = {
		...before,
		tables: {
			...before.tables,
			memberships: [
				{
					_id: "owner-access",
					userId: "owner",
					clubId: "target",
					admin: false,
					personId: "edwin",
				},
			],
			members:
				before.tables.members?.map((row) =>
					row._id === "other-person"
						? { ...row, value: { id: "other-person", name: "Changed" } }
						: row,
				) ?? [],
		},
	};
	const report = audit(before, after);
	expect(report.status).toBe("fail");
	expect(report.outsideDifferences.map((item) => item.table).sort()).toEqual([
		"members",
		"memberships",
	]);
	expect(JSON.stringify(report)).not.toContain("Untouched");
	expect(JSON.stringify(report)).not.toContain("Changed");
});

test("auth metadata is reported for review while new target grants fail", (): void => {
	const before = add(baseline(), "authSessions", {
		_id: "session",
		userId: "owner",
		expirationTime: 10,
	});
	const after = {
		...before,
		tables: {
			...before.tables,
			authSessions: [{ _id: "session", userId: "owner", expirationTime: 20 }],
		},
	};
	expect(audit(before, after).status).toBe("review_required");
	expect(audit(before, after).metadataDifferences).toHaveLength(1);
	const granted = add(after, "memberships", {
		_id: "unrequested-access",
		clubId: "target",
		userId: "other-user",
		personId: "edwin",
		admin: true,
	});
	expect(
		audit(before, granted).issues.some(
			(item) => item.code === "unexpected_new_access_record",
		),
	).toBe(true);
});

test("only explicitly approved owner coaching across exactly six actual programs is exempted", (): void => {
	const original = baseline();
	const programIds = ["one", "two", "three", "four", "five", "six"];
	const before: ExportSnapshot = {
		...original,
		tables: {
			...original.tables,
			memberships:
				original.tables.memberships?.map((row) => ({
					...row,
					coachPrograms: [],
				})) ?? [],
		},
	};
	const after: ExportSnapshot = {
		...before,
		tables: {
			...before.tables,
			clubs:
				before.tables.clubs?.map((row) =>
					row._id === "target"
						? {
								...row,
								programs: programIds.map((program) => ({ id: program })),
							}
						: row,
				) ?? [],
			memberships:
				before.tables.memberships?.map((row) => ({
					...row,
					coachPrograms: [...programIds].reverse(),
				})) ?? [],
		},
	};
	const approved = auditLocalHistory(before, after, "fixture@example.com", {
		enableOwnerCoaching: true,
	});
	expect(approved.status).toBe("pass");
	expect(approved.approvedDifferences).toHaveLength(1);
	expect(approved.approvedDifferences.at(0)?.code).toBe(
		"approved_owner_coaching_assignment",
	);
	expect(approved.approvedDifferences.at(0)?.beforeHash).toHaveLength(64);
	expect(approved.approvedDifferences.at(0)?.afterHash).toHaveLength(64);
	expect(audit(before, after).status).toBe("fail");
	const wrongProgram: ExportSnapshot = {
		...after,
		tables: {
			...after.tables,
			memberships:
				after.tables.memberships?.map((row) => ({
					...row,
					coachPrograms: ["wrong", ...programIds.slice(1)],
				})) ?? [],
		},
	};
	expect(
		auditLocalHistory(before, wrongProgram, "fixture@example.com", {
			enableOwnerCoaching: true,
		}).status,
	).toBe("fail");
	const extraField: ExportSnapshot = {
		...after,
		tables: {
			...after.tables,
			memberships:
				after.tables.memberships?.map((row) => ({
					...row,
					children: ["another-person"],
				})) ?? [],
		},
	};
	expect(
		auditLocalHistory(before, extraField, "fixture@example.com", {
			enableOwnerCoaching: true,
		}).status,
	).toBe("fail");
	const alreadyCoach: ExportSnapshot = {
		...before,
		tables: {
			...before.tables,
			memberships:
				before.tables.memberships?.map((row) => ({
					...row,
					coachPrograms: ["one"],
				})) ?? [],
		},
	};
	expect(
		auditLocalHistory(alreadyCoach, after, "fixture@example.com", {
			enableOwnerCoaching: true,
		}).status,
	).toBe("fail");
});

test("imported actors remain name-only without logins or membership grants", (): void => {
	const before = baseline();
	const actor = add(
		add(before, "users", { _id: "actor", name: "Coach" }),
		"migrationReferences",
		{
			_id: "actor-ref",
			clubId: "target",
			kind: "actors",
			key: "actors:one",
			targetId: "actor",
		},
	);
	expect(audit(before, actor).status).toBe("pass");
	const bad = add(actor, "authAccounts", {
		_id: "login",
		userId: "actor",
		provider: "password",
	});
	expect(
		audit(before, bad).issues.some(
			(item) => item.code === "import_actor_has_access",
		),
	).toBe(true);
});

test("recorded historical performance is deliberately unlinked but real event references are checked", (): void => {
	const before = baseline();
	const recorded = add(before, "sessionPerformance", {
		_id: "history",
		clubId: "target",
		personId: "edwin",
		eventId: "source:unlinked",
		dateKind: "recorded",
		eventDate: "2026-10-01",
		programId: "club",
		authorId: "owner",
		authorKey: "owner",
		kind: "self",
		rating: 7,
	});
	expect(audit(before, recorded).status).toBe("pass");
	const invalid = add(recorded, "responses", {
		_id: "response",
		clubId: "target",
		value: {
			id: "response",
			personId: "edwin",
			eventId: "missing",
			response: "going",
			attendance: "present",
		},
	});
	expect(
		audit(before, invalid).issues.some(
			(item) =>
				item.code === "invalid_foreign_key" && item.fields?.includes("eventId"),
		),
	).toBe(true);
});

test("stored videos require valid files and exact exported byte sizes", (): void => {
	const before = baseline();
	const linked = add(
		add(
			add(before, "resources", {
				_id: "video",
				clubId: "target",
				key: "video",
				kind: "video",
				fileId: "file",
				personIds: ["edwin"],
			}),
			"resourceFiles",
			{
				_id: "file",
				clubId: "target",
				storageId: "storage",
				purpose: "video",
				resourceId: "video",
				size: 15,
			},
		),
		"_storage",
		{ _id: "storage", size: 15 },
	);
	const after = {
		...linked,
		storage: [{ id: "storage", path: "_storage/storage.mp4", size: 15 }],
	};
	expect(audit(before, after).status).toBe("pass");
	for (const resourceId of [undefined, "another-resource"]) {
		const invalid = {
			...after,
			tables: {
				...after.tables,
				resourceFiles: (after.tables.resourceFiles ?? []).map((file) => ({
					...file,
					...(resourceId ? { resourceId } : { resourceId: null }),
				})),
			},
		};
		expect(
			audit(before, invalid).issues.some(
				(issue) => issue.code === "resource_file_ownership_mismatch",
			),
		).toBe(true);
	}
	expect(audit(before, after).media).toEqual({
		videos: 1,
		storedVideos: 1,
		externalVideos: 0,
		files: 1,
	});
	expect(
		audit(before, {
			...after,
			storage: [{ id: "storage", path: "_storage/storage.mp4", size: 14 }],
		}).issues.some((item) => item.code === "storage_size_mismatch"),
	).toBe(true);
	expect(
		audit(before, { ...after, storage: [] }).issues.some(
			(item) => item.code === "missing_storage_file",
		),
	).toBe(true);
});

test("actual fitness results reconcile session counts and aggregates, and duplicate identities fail", (): void => {
	const before = baseline();
	const after = add(
		add(
			add(
				add(before, "fitnessTests", {
					_id: "test",
					clubId: "target",
					unit: "time",
				}),
				"fitnessSessions",
				{
					_id: "attempt",
					clubId: "target",
					testId: "test",
					seasonId: "season",
					date: "2026-10-01",
					resultCount: 1,
				},
			),
			"fitnessResults",
			{
				_id: "result",
				clubId: "target",
				testId: "test",
				seasonId: "season",
				date: "2026-10-01",
				sessionId: "attempt",
				personId: "edwin",
				value: 90,
			},
		),
		"fitnessStats",
		{
			_id: "stat",
			clubId: "target",
			testId: "test",
			seasonId: "season",
			personId: "edwin",
			count: 1,
			total: 90,
			best: 90,
		},
	);
	expect(audit(before, after).status).toBe("pass");
	const duplicate = add(after, "fitnessResults", {
		_id: "duplicate",
		clubId: "target",
		testId: "test",
		seasonId: "season",
		date: "2026-10-01",
		sessionId: "attempt",
		personId: "edwin",
		value: 90,
	});
	const report = audit(before, duplicate);
	expect(
		report.issues.some((item) => item.code === "duplicate_domain_key"),
	).toBe(true);
	expect(
		report.issues.some(
			(item) => item.code === "fitness_session_count_mismatch",
		),
	).toBe(true);
	expect(
		report.issues.some((item) => item.code === "fitness_stats_mismatch"),
	).toBe(true);
});

test("dangling reference ledgers never substitute for imported domain documents", (): void => {
	const before = baseline();
	const after = add(before, "migrationReferences", {
		_id: "ref",
		clubId: "target",
		key: "members:missing",
		kind: "members",
		targetId: "missing",
	});
	const report = audit(before, after);
	expect(report.status).toBe("fail");
	expect(
		report.issues.some(
			(item) => item.code === "dangling_or_cross_club_migration_reference",
		),
	).toBe(true);
	expect(report.counts.members?.target).toBe(1);
});
