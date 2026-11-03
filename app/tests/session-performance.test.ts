import { expect, test } from "bun:test";
import { createStore } from "jotai";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	previewPerformanceReportCommand,
	previewPerformanceReportReview,
	previewPerformanceReports,
	previewSessionPerformanceAtom,
	previewSessionPerformanceCommand,
} from "../src/demo/session-performance-state";
import { planSessionMemberPreview } from "../src/domain/session-member-merge";
import {
	canEditSessionPerformance,
	canReadSessionPerformance,
	canReportSessionPerformance,
	canWriteSessionPerformance,
	nextSessionPerformance,
	performanceMemberMergeConflicts,
	performanceSession,
	performanceSessionEligible,
	type SessionPerformanceCommand,
	sessionPerformanceHistory,
	validateSessionPerformance,
} from "../src/domain/session-performance";

const event = initialAppData.events.find((entry) => entry.id === "club-thu");
const member = initialAppData.members.find((entry) => entry.id === "sam");
const guardian = previewAccounts.find((entry) => entry.id === "jamie");
if (!event || !member || !guardian)
	throw new Error("Missing performance fixtures.");
const command: SessionPerformanceCommand = {
	personId: member.id,
	eventId: event.id,
	kind: "coach",
	rating: 7,
	comments: " Good support ",
	revision: 0,
	requestId: "session-performance-fixture",
};

test("unlinked recorded-date history stays private and read-only even if an event later shares its source ID", (): void => {
	const linked = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		event,
		"imported",
		1,
	);
	const recorded: typeof linked = { ...linked, dateKind: "recorded" };
	expect(
		canEditSessionPerformance(primaryAccount, member, event, recorded),
	).toBe(false);
	expect(sessionPerformanceHistory([recorded], guardian, member)).toEqual([
		recorded,
	]);
	expect(
		sessionPerformanceHistory(
			[recorded],
			{ ...guardian, children: [], admin: true },
			member,
		),
	).toEqual([]);
	expect(() =>
		nextSessionPerformance(
			recorded,
			{ ...command, revision: recorded.revision },
			primaryAccount,
			event,
			recorded.id,
			2,
		),
	).toThrow("read-only");
});

test("coach history filters before the first page so newer self-ratings cannot bury feedback", (): void => {
	const coach = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		event,
		"coach-history",
		1,
	);
	const self = Array.from({ length: 12 }, (_, index) => ({
		...coach,
		id: `self-${index}`,
		kind: "self" as const,
		eventDate: `2026-11-${String(index + 1).padStart(2, "0")}`,
	}));
	const records = [...self, coach];
	expect(
		sessionPerformanceHistory(records, guardian, member)
			.slice(0, 6)
			.every((entry) => entry.kind === "self"),
	).toBe(true);
	expect(
		sessionPerformanceHistory(records, guardian, member, "coach").slice(0, 6),
	).toEqual([coach]);
	expect(records.at(0)?.id).toBe("self-0");
	expect(
		sessionPerformanceHistory(records, guardian, member, "self"),
	).toHaveLength(12);
});

test("filtered session history preserves private readership and excludes removed or unrelated records", (): void => {
	const entry = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		event,
		"coach-history",
		1,
	);
	const records = [
		entry,
		{ ...entry, id: "removed", removed: true },
		{ ...entry, id: "other-player", personId: "other-player" },
	];
	expect(sessionPerformanceHistory(records, guardian, member, "coach")).toEqual(
		[entry],
	);
	expect(
		sessionPerformanceHistory(
			records,
			{ ...guardian, children: [], admin: true },
			member,
			"coach",
		),
	).toEqual([]);
	expect(
		sessionPerformanceHistory(records, guardian, undefined, "coach"),
	).toEqual([]);
	expect(
		sessionPerformanceHistory(
			records,
			guardian,
			{ ...member, mergedInto: "current-profile" },
			"coach",
		),
	).toEqual([]);
});

test("session ratings validate the distinct 1–10 scale and bounded comments", (): void => {
	for (const rating of [1, 5, 10])
		expect(validateSessionPerformance({ ...command, rating })).toBeUndefined();
	for (const rating of [0, 11, 1.5, Number.NaN])
		expect(validateSessionPerformance({ ...command, rating })).toBeDefined();
	expect(validateSessionPerformance({ ...command, eventId: "" })).toBeDefined();
	expect(
		validateSessionPerformance({ ...command, comments: "x".repeat(2001) }),
	).toBeDefined();
});
test("session-note reports use current private readers, exact versions and the existing admin review contract", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(previewSessionPerformanceAtom, []);
	const id = store.set(previewSessionPerformanceCommand, command);
	const row = store.get(previewSessionPerformanceAtom).at(0);
	if (!row) throw new Error("Missing rating fixture.");
	expect(canReportSessionPerformance(primaryAccount, member, row)).toBe(false);
	expect(canReportSessionPerformance(guardian, member, row)).toBe(true);
	expect(
		canReportSessionPerformance(guardian, member, { ...row, kind: "self" }),
	).toBe(false);
	store.set(previewAccountIdAtom, "morgan");
	expect(() =>
		store.set(previewPerformanceReportCommand, {
			id,
			revision: 1,
			reason: "Private attack",
		}),
	).toThrow("unavailable");
	store.set(previewAccountIdAtom, "jamie");
	expect(() =>
		store.set(previewPerformanceReportCommand, {
			id,
			revision: 0,
			reason: "Stale",
		}),
	).toThrow("changed");
	expect(() =>
		store.set(previewPerformanceReportCommand, {
			id,
			revision: 1,
			reason: " ",
		}),
	).toThrow("reason");
	store.set(previewPerformanceReportCommand, {
		id,
		revision: 1,
		reason: "Please review",
	});
	store.set(previewPerformanceReportCommand, {
		id,
		revision: 1,
		reason: "Retry",
	});
	expect(store.get(previewPerformanceReports)).toHaveLength(1);
	const report = store.get(previewPerformanceReports).at(0);
	if (!report) throw new Error("Missing report fixture.");
	expect(report.body).toBe(row.comments);
	expect(() =>
		store.set(previewPerformanceReportReview, {
			id: report._id,
			decision: "removed",
		}),
	).toThrow("Administrator");
	store.set(previewAccountIdAtom, "alex");
	store.set(previewSessionPerformanceCommand, {
		...command,
		revision: 1,
		comments: "Newer feedback",
		requestId: "edited-reported-rating",
	});
	expect(() =>
		store.set(previewPerformanceReportReview, {
			id: report._id,
			decision: "removed",
		}),
	).toThrow("changed");
	expect(store.get(previewSessionPerformanceAtom).at(0)?.comments).toBe(
		"Newer feedback",
	);
	store.set(previewPerformanceReportReview, {
		id: report._id,
		decision: "dismissed",
	});
	store.set(previewAccountIdAtom, "jamie");
	store.set(previewPerformanceReportCommand, {
		id,
		revision: 2,
		reason: "Review newer feedback",
	});
	const latest = store.get(previewPerformanceReports).at(-1);
	if (!latest) throw new Error("Missing current report.");
	store.set(previewAccountIdAtom, "alex");
	store.set(previewPerformanceReportReview, {
		id: latest._id,
		decision: "removed",
	});
	expect(store.get(previewSessionPerformanceAtom).at(0)).toMatchObject({
		id,
		removed: true,
		comments: "",
		revision: 3,
	});
	expect(() =>
		store.set(previewSessionPerformanceCommand, {
			...command,
			revision: 3,
			requestId: "resurrect-removed-rating",
		}),
	).toThrow("removed");
	store.set(previewSessionPerformanceCommand, command);
	expect(store.get(previewSessionPerformanceAtom).at(0)?.removed).toBe(true);
});
test("session performance is private and coach/self capabilities never depend on a role mode", (): void => {
	expect(canReadSessionPerformance(guardian, member)).toBe(true);
	expect(canWriteSessionPerformance(guardian, member, "self")).toBe(true);
	expect(canWriteSessionPerformance(guardian, member, "coach")).toBe(false);
	const admin = { ...guardian, children: [], admin: true };
	expect(canReadSessionPerformance(admin, member)).toBe(false);
	expect(canWriteSessionPerformance(admin, member, "coach")).toBe(false);
	expect(canWriteSessionPerformance(primaryAccount, member, "coach")).toBe(
		true,
	);
	expect(canWriteSessionPerformance(primaryAccount, member, "self")).toBe(
		false,
	);
	expect(
		canReadSessionPerformance(primaryAccount, {
			...member,
			mergedInto: "other",
		}),
	).toBe(false);
	expect(
		canWriteSessionPerformance(
			primaryAccount,
			{ ...member, archived: true },
			"coach",
		),
	).toBe(false);
	expect(
		performanceSessionEligible(member, { ...event, cancelled: true }),
	).toBe(false);
	expect(
		performanceSessionEligible(member, { ...event, eligiblePersonIds: [] }),
	).toBe(false);
});
test("updates preserve linked session snapshots, revision and all other player/goal state", (): void => {
	const before = structuredClone(initialAppData);
	const first = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		{ ...event, seriesId: "numbered-series", seriesOrder: 3 },
		"record",
		1,
	);
	expect(first.sessionNumber).toBe(4);
	expect(first.comments).toBe("Good support");
	const edited = nextSessionPerformance(
		first,
		{ ...command, revision: 1, rating: 8 },
		primaryAccount,
		{ ...event, title: "Renamed practice", date: "2099-01-01", seriesOrder: 8 },
		"new-id",
		2,
	);
	expect(edited.id).toBe("record");
	expect(edited.eventTitle).toBe(first.eventTitle);
	expect(edited.eventDate).toBe(first.eventDate);
	expect(edited.sessionNumber).toBe(4);
	expect(edited.revision).toBe(2);
	expect(() =>
		nextSessionPerformance(
			edited,
			{ ...command, revision: 1 },
			primaryAccount,
			event,
			"new",
			3,
		),
	).toThrow("rating changed");
	expect(initialAppData).toEqual(before);
	const standalone = { ...event, seriesOrder: undefined };
	expect(performanceSession(standalone).sessionNumber).toBeUndefined();
	expect(
		performanceSession({ ...standalone, seriesId: undefined, seriesOrder: 0 })
			.sessionNumber,
	).toBeUndefined();
	const unnumbered = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		standalone,
		"standalone",
		3,
	);
	expect(unnumbered.sessionNumber).toBeUndefined();
	expect(
		nextSessionPerformance(
			unnumbered,
			{ ...command, revision: 1 },
			primaryAccount,
			{ ...event, seriesOrder: 4 },
			"replacement",
			4,
		).sessionNumber,
	).toBeUndefined();
});
test("preview writes share server retry, author identity, privacy and concurrent-edit rules", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(previewSessionPerformanceAtom, []);
	const first = store.set(previewSessionPerformanceCommand, command);
	expect(store.set(previewSessionPerformanceCommand, command)).toBe(first);
	expect(store.get(previewSessionPerformanceAtom)).toHaveLength(1);
	expect(() =>
		store.set(previewSessionPerformanceCommand, { ...command, rating: 9 }),
	).toThrow("another session rating");
	store.set(previewAccountIdAtom, "casey");
	store.set(previewSessionPerformanceCommand, {
		...command,
		requestId: "second-coach-session-rating",
	});
	expect(store.get(previewSessionPerformanceAtom)).toHaveLength(2);
	store.set(previewAccountIdAtom, "jamie");
	const self = {
		...command,
		kind: "self",
		requestId: "shared-self-session-rating",
	} as const;
	store.set(previewSessionPerformanceCommand, self);
	store.set(previewAccountIdAtom, "taylor");
	expect(() =>
		store.set(previewSessionPerformanceCommand, {
			...self,
			requestId: "stale-family-session-rating",
		}),
	).toThrow("rating changed");
	store.set(previewSessionPerformanceCommand, {
		...self,
		revision: 1,
		rating: 8,
		requestId: "family-edit-session-rating",
	});
	expect(
		store
			.get(previewSessionPerformanceAtom)
			.filter((entry) => entry.kind === "self"),
	).toHaveLength(1);
	store.set(previewAccountIdAtom, "morgan");
	expect(() =>
		store.set(previewSessionPerformanceCommand, {
			...self,
			revision: 2,
			requestId: "unrelated-session-rating",
		}),
	).toThrow("private");
});
test("merge preserves independent coach histories but refuses same-coach and shared-self collisions", (): void => {
	const original = nextSessionPerformance(
		undefined,
		command,
		primaryAccount,
		event,
		"original-row",
		42,
	);
	const source = { ...original, personId: "source" };
	const distinct = {
		...original,
		id: "target-row",
		personId: "target",
		authorId: "other-coach",
	};
	expect(
		performanceMemberMergeConflicts([source, distinct], "source", "target"),
	).toEqual([]);
	expect(
		performanceMemberMergeConflicts(
			[source, { ...distinct, authorId: source.authorId }],
			"source",
			"target",
		),
	).toHaveLength(1);
	expect(
		performanceMemberMergeConflicts(
			[
				{ ...source, kind: "self" },
				{ ...distinct, kind: "self" },
			],
			"source",
			"target",
		),
	).toHaveLength(1);
	const data = {
		teams: [],
		series: [],
		checkins: [],
		fitness: { tests: [], sessions: [], results: [] },
		performance: [source, distinct],
	};
	const merged = planSessionMemberPreview(data, "source", "target");
	expect(merged.conflicts).toEqual([]);
	expect(merged.next.performance?.at(0)).toEqual({
		...source,
		personId: "target",
		revision: source.revision + 1,
	});
	expect(merged.next.performance?.at(1)).toBe(distinct);
	const collision = {
		...data,
		performance: [source, { ...distinct, authorId: source.authorId }],
	};
	expect(planSessionMemberPreview(collision, "source", "target").next).toBe(
		collision,
	);
});
