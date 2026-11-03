import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import {
	type FitnessState,
	fitnessSummary,
	reduceFitness,
} from "../src/domain/fitness-model";
import { defaultSeasonId } from "../src/domain/seasons";

const initial: FitnessState = {
	tests: [
		{
			_id: "swim",
			name: "50 m swim",
			unit: "time",
			archived: false,
			revision: 0,
		},
	],
	sessions: [
		{
			_id: "session",
			testId: "swim",
			seasonId: defaultSeasonId,
			date: "2026-10-25",
			notes: "",
			revision: 0,
			resultCount: 0,
		},
	],
	results: [],
};
const save = (
	state: FitnessState,
	value: string,
	revision: number,
): FitnessState =>
	reduceFitness(state, primaryAccount, initialAppData, {
		type: "save-results",
		input: {
			sessionId: "session",
			revision,
			entries: [{ personId: "sam", value, notes: "" }],
		},
	});

test("merged source aliases cannot recreate fitness results, while ordinary archived history stays correctable", (): void => {
	const action = {
		type: "save-results",
		input: {
			sessionId: "session",
			revision: 0,
			entries: [{ personId: "sam", value: "1:25", notes: "" }],
		},
	} as const;
	const entries = action.input.entries.map((entry) => ({ ...entry }));
	const input = { ...action, input: { ...action.input, entries } };
	expect(() =>
		reduceFitness(
			initial,
			primaryAccount,
			{
				...initialAppData,
				members: initialAppData.members.map((member) =>
					member.id === "sam"
						? { ...member, archived: true, mergedInto: "alex" }
						: member,
				),
			},
			input,
		),
	).toThrow("merged");
	expect(
		reduceFitness(
			initial,
			primaryAccount,
			{
				...initialAppData,
				members: initialAppData.members.map((member) =>
					member.id === "sam" ? { ...member, archived: true } : member,
				),
			},
			input,
		).results,
	).toHaveLength(1);
});

test("fitness preview uses real parsing, corrections, clearing and direction-aware statistics", (): void => {
	const saved = save(initial, "1:24.50", 0);
	expect(saved.results.at(0)?.value).toBe(84.5);
	expect(saved.sessions.at(0)).toMatchObject({ resultCount: 1, revision: 1 });
	const corrected = save(saved, "1:20", 1);
	expect(corrected.results).toHaveLength(1);
	expect(fitnessSummary("time", corrected.results)).toEqual({
		count: 1,
		total: 80,
		best: 80,
	});
	expect(() => save(corrected, "1:70", 2)).toThrow("m:ss");
	expect(() => save(corrected, "1:19", 1)).toThrow("record changed");
	const cleared = save(corrected, "", 2);
	expect(cleared.results).toEqual([]);
	expect(cleared.sessions.at(0)?.resultCount).toBe(0);
	expect(fitnessSummary("time", cleared.results)).toBeUndefined();
});

test("archived tests retain history and block result edits until restored", (): void => {
	const saved = save(initial, "1:24", 0);
	const archived = reduceFitness(saved, primaryAccount, initialAppData, {
		type: "archive-test",
		testId: "swim",
		revision: 0,
		archived: true,
	});
	expect(archived.results).toBe(saved.results);
	expect(() => save(archived, "1:23", 1)).toThrow("Restore the test");
	const restored = reduceFitness(archived, primaryAccount, initialAppData, {
		type: "archive-test",
		testId: "swim",
		revision: 1,
		archived: false,
	});
	expect(save(restored, "1:23", 1).results.at(0)?.value).toBe(83);
});

test("fitness sessions validate seasons, duplicates and revisions and delete only their own results", (): void => {
	expect(() =>
		reduceFitness(initial, primaryAccount, initialAppData, {
			type: "save-session",
			id: "duplicate",
			input: {
				testId: "swim",
				seasonId: defaultSeasonId,
				date: "2026-10-25",
				notes: "",
			},
		}),
	).toThrow("already exists");
	expect(() =>
		reduceFitness(initial, primaryAccount, initialAppData, {
			type: "save-session",
			id: "outside",
			input: {
				testId: "swim",
				seasonId: defaultSeasonId,
				date: "2028-10-25",
				notes: "",
			},
		}),
	).toThrow("within the season");
	const saved = save(initial, "1:24", 0);
	const deleted = reduceFitness(saved, primaryAccount, initialAppData, {
		type: "delete-session",
		sessionId: "session",
		revision: 1,
	});
	expect(deleted.sessions).toEqual([]);
	expect(deleted.results).toEqual([]);
	expect(deleted.tests).toBe(initial.tests);
	expect(() =>
		reduceFitness(
			initial,
			{ ...primaryAccount, coachPrograms: [] },
			initialAppData,
			{ type: "delete-session", sessionId: "session", revision: 0 },
		),
	).toThrow("Coach access");
});
