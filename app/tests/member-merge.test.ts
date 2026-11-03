import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData } from "../src/demo/app-data";
import {
	previewAccountAtom,
	previewAccountIdAtom,
	previewDataAtom,
} from "../src/demo/app-state";
import { previewDevelopmentAtom } from "../src/demo/development-state";
import { previewGoalReflectionsAtom } from "../src/demo/goal-reflections-state";
import {
	mergePreviewMemberAtom,
	previewMemberMergeAudits,
	previewMemberMergePlanAtom,
} from "../src/demo/member-merge-state";
import { previewMemberProfiles } from "../src/demo/member-profile-state";
import { previewResources } from "../src/demo/resource-state";
import {
	previewPerformanceReportFixture,
	previewPerformanceReports,
} from "../src/demo/session-performance-state";
import type { Account, Member } from "../src/domain/app-types";
import { coreMemberMerge } from "../src/domain/core-member-merge";
import {
	assertDevelopmentReopen,
	type DevelopmentReview,
	developmentPlayer,
} from "../src/domain/development";
import { mergeDevelopmentHistory } from "../src/domain/development-member-merge";
import {
	canonicalMemberAccount,
	memberIdentityConflicts,
	mergedAccount,
} from "../src/domain/member-merge-identity";
import { defaultPlayerCoaching } from "../src/domain/player-coaching";
import { mergedProfileFields } from "../src/domain/profile-member-merge";
import { mergeSeasonHistory } from "../src/domain/season-member-merge";

const source: Member = {
	id: "old",
	name: "Archived Player",
	archived: true,
	programs: ["youth"],
	position: "Wing",
	rating: 40,
	registration: "missing",
	goal: "Original goal",
	steps: 2,
};
const target: Member = {
	...source,
	id: "new",
	name: "Current Player",
	archived: false,
	programs: ["club"],
	goal: "Current goal",
	goalRevision: 3,
	steps: 4,
};
const account = (
	id: string,
	personId: string,
	children: string[] = [],
): Account => ({
	id,
	personId,
	children,
	name: id,
	admin: false,
	coachPrograms: [],
});

test("merge compares complete private audiences, not only guardian subsets", (): void => {
	for (const accounts of [
		[account("guardian", "guardian", [source.id]), account("self", target.id)],
		[account("self", source.id), account("guardian", "guardian", [target.id])],
		[account("one", source.id), account("two", target.id)],
		[account("one", "one", [source.id]), account("two", "two", [target.id])],
	])
		expect(
			memberIdentityConflicts(accounts, { source, target }).length,
		).toBeGreaterThan(0);
	expect(
		memberIdentityConflicts(
			[account("parent", "parent", [source.id, target.id])],
			{ source, target },
		),
	).toEqual([]);
	expect(
		memberIdentityConflicts([account("parent", "parent", [source.id])], {
			source,
			target,
		}),
	).toEqual([]);
	const resolved = canonicalMemberAccount(
		account("parent", "parent", [source.id, target.id]),
		[{ ...source, mergedInto: target.id }, target],
	);
	expect(resolved.children).toEqual([target.id]);
	expect(resolved.admin).toBe(false);
	const preferred = {
		...account("parent", "parent", [source.id]),
		defaultPersonId: source.id,
	};
	expect(
		canonicalMemberAccount(preferred, [
			{ ...source, mergedInto: target.id },
			target,
		]).defaultPersonId,
	).toBe(target.id);
	expect(mergedAccount(preferred, { source, target }).defaultPersonId).toBe(
		target.id,
	);
});

test("core collisions are actionable and never partially change the input", (): void => {
	const data = {
		...initialAppData,
		members: [source, target],
		responses: [
			{
				eventId: "same",
				personId: source.id,
				response: "going" as const,
				attendance: "present" as const,
			},
			{
				eventId: "same",
				personId: target.id,
				response: "going" as const,
				attendance: "present" as const,
			},
		],
		charges: [
			{ personId: source.id, amount: 10 },
			{ personId: target.id, amount: 20 },
		],
	};
	const plan = coreMemberMerge(data, { source, target });
	expect(plan.next).toBe(data);
	expect(plan.conflicts.map((row) => row.category)).toContain("Attendance");
	expect(plan.conflicts.map((row) => row.category)).toContain(
		"Membership dues",
	);
	expect(plan.conflicts.every((row) => row.record && row.resolution)).toBe(
		true,
	);
});

test("development merge keeps every review, target current round and original round coordinates", (): void => {
	const rounds = [source.id, target.id].map((personId) => ({
		personId,
		round: 1,
		revision: 2,
		status: "open" as const,
		requiredCoachIds: ["coach"],
		profileRevision: 0,
		updatedAt: 10,
	}));
	const reviews: DevelopmentReview[] = rounds.map((row) => ({
		personId: row.personId,
		round: 1,
		revision: 3,
		coachId: "coach",
		status: "submitted" as const,
		rating: row.personId === source.id ? 45 : 60,
		observation: row.personId,
		updatedAt: 10,
	}));
	const merged = mergeDevelopmentHistory(rounds, reviews, source.id, target.id);
	expect(
		merged.rounds.map((row) => [
			row.personId,
			row.round,
			row.status,
			row.revision,
		]),
	).toEqual([
		[target.id, 1, "superseded", 3],
		[target.id, 2, "open", 3],
	]);
	expect(
		merged.reviews.map((row) => [row.round, row.observation, row.rating]),
	).toEqual([
		[1, source.id, 45],
		[2, target.id, 60],
	]);
	expect(merged.reviews.at(0)?.originPersonId).toBe(source.id);
	expect(merged.reviews.at(0)?.originRound).toBe(1);
});

test("profile merge fills only explicitly opted-in empty fields and keeps target values", (): void => {
	const old = {
		email: "old@example.test",
		phone: "+1 403 555 0100",
		capNumber: 7,
		photoId: "photo",
	};
	const current = { email: "current@example.test", phone: "" };
	expect(mergedProfileFields(old, current, false).filledFields).toEqual([]);
	const merged = mergedProfileFields(old, current, true);
	expect(merged.fields.email).toBe(current.email);
	expect(merged.fields.phone).toBe(old.phone);
	expect(merged.filledFields).toEqual(["Phone", "Cap number", "Profile photo"]);
});

test("a source-only open review becomes preserved history with an explicit usable next-round path", (): void => {
	const round = {
		personId: source.id,
		round: 1,
		revision: 1,
		status: "open" as const,
		requiredCoachIds: ["coach"],
		profileRevision: 0,
		updatedAt: 10,
	};
	const merged = mergeDevelopmentHistory([round], [], source.id, target.id);
	const player = developmentPlayer(
		target,
		defaultPlayerCoaching(target),
		merged.rounds.at(0),
		[],
		[{ id: "coach", name: "Coach" }],
		"coach",
	);
	expect(player.round?.status).toBe("superseded");
	expect(() => assertDevelopmentReopen(player)).not.toThrow();
	expect(player.canFinalize).toBe(false);
});

test("season history retains ledger identity and rejects two populated summaries", (): void => {
	const summary = {
		personId: source.id,
		seasonId: "season",
		registration: "approved" as const,
		cuga: true,
		due: 100,
		paid: 50,
		revision: 2,
	};
	const history = [
		{
			id: "ledger-original",
			personId: source.id,
			seasonId: "season",
			actor: "coach",
			note: "Original note",
		},
	];
	const merged = mergeSeasonHistory(
		{ [`season:${source.id}`]: summary },
		history,
		source.id,
		target.id,
	);
	expect(merged.history.at(0)?.id).toBe("ledger-original");
	expect(merged.history.at(0)?.personId).toBe(target.id);
	expect(merged.history.at(0)?.note).toBe("Original note");
	expect(merged.records[`season:${target.id}`]?.revision).toBe(3);
	const collision = mergeSeasonHistory(
		{
			[`season:${source.id}`]: summary,
			[`season:${target.id}`]: { ...summary, personId: target.id },
		},
		history,
		source.id,
		target.id,
	);
	expect(collision.conflicts).toHaveLength(1);
	expect(collision.history).toEqual(history);
});

test("Jotai merge is atomic, replay-safe, stale-safe and preserves canonical goal and private history", (): void => {
	const store = createStore();
	const sam = initialAppData.members.find((row) => row.id === "sam");
	if (!sam) throw new Error("Sample member unavailable.");
	const canonical = {
		...target,
		id: "canonical-sam",
		programs: ["club"],
		goal: "Authoritative goal",
		goalRevision: 9,
	};
	store.set(previewDataAtom, {
		...initialAppData,
		members: [
			...initialAppData.members.map((row) =>
				row.id === sam.id ? { ...row, archived: true } : row,
			),
			canonical,
		],
	});
	store.set(previewMemberProfiles, {
		sam: {
			email: "old@example.test",
			phone: "+1 403 555 0100",
			capNumber: 7,
			revision: 1,
			lastKey: "",
			lastActorId: "",
			lastPayload: "",
		},
		[canonical.id]: {
			email: "current@example.test",
			phone: "",
			revision: 2,
			lastKey: "",
			lastActorId: "",
			lastPayload: "",
		},
	});
	store.set(previewGoalReflectionsAtom, [
		{
			id: "reflection",
			personId: sam.id,
			authorId: "sam-login",
			requestId: "reflection-request",
			goal: sam.goal,
			note: "Original self note",
			selfRating: 3,
			createdAt: 42,
			checkIn: 2,
		},
	]);
	store.set(previewDevelopmentAtom, { rounds: [], reviews: [] });
	store.set(previewResources, []);
	store.set(previewPerformanceReports, [previewPerformanceReportFixture]);
	const input = {
		sourceId: sam.id,
		targetId: canonical.id,
		fillEmptyProfile: true,
	};
	const first = store.get(previewMemberMergePlanAtom(input));
	expect(first.conflicts).toEqual([]);
	const command = {
		...input,
		token: first.token,
		confirmation: canonical.name,
		key: "merge-request-123456789",
	};
	const before = store.get(previewDataAtom);
	expect(() =>
		store.set(mergePreviewMemberAtom, { ...command, confirmation: "wrong" }),
	).toThrow("full name");
	expect(store.get(previewDataAtom)).toBe(before);
	store.set(previewDataAtom, {
		...before,
		members: before.members.map((row) =>
			row.id === canonical.id ? { ...row, steps: 5 } : row,
		),
	});
	expect(() => store.set(mergePreviewMemberAtom, command)).toThrow("changed");
	const fresh = {
		...command,
		token: store.get(previewMemberMergePlanAtom(input)).token,
	};
	expect(store.set(mergePreviewMemberAtom, fresh)).toBe(canonical.id);
	expect(store.set(mergePreviewMemberAtom, fresh)).toBe(canonical.id);
	const after = store.get(previewDataAtom);
	expect(after.members.find((row) => row.id === sam.id)?.mergedInto).toBe(
		canonical.id,
	);
	expect(after.members.find((row) => row.id === sam.id)?.goal).toBe(sam.goal);
	expect(
		after.members.find((row) => row.id === canonical.id)?.goalRevision,
	).toBe(9);
	expect(
		after.members.find((row) => row.id === canonical.id)?.programs,
	).toEqual(["club", "youth", "sunday", "friday"]);
	expect(after.responses.some((row) => row.personId === sam.id)).toBe(false);
	store.set(previewAccountIdAtom, "jamie");
	expect(store.get(previewAccountAtom).children).toContain(canonical.id);
	expect(store.get(previewAccountAtom).children).not.toContain(sam.id);
	expect(store.get(previewGoalReflectionsAtom).at(0)).toMatchObject({
		id: "reflection",
		personId: canonical.id,
		authorId: "sam-login",
		note: "Original self note",
	});
	expect(store.get(previewMemberProfiles)[canonical.id]).toMatchObject({
		email: "current@example.test",
		phone: "+1 403 555 0100",
		capNumber: 7,
		revision: 3,
	});
	expect(store.get(previewMemberMergeAudits)).toHaveLength(1);
	expect(store.get(previewPerformanceReports).at(0)?.source.personId).toBe(
		canonical.id,
	);
	store.set(previewAccountIdAtom, "taylor");
	expect(() => store.set(mergePreviewMemberAtom, fresh)).toThrow(
		"Administrator",
	);
});
