import { validDate } from "./app-rules";
import type { Account, AppData } from "./app-types";
import {
	type FitnessSummary,
	type FitnessUnit,
	fitnessLowerIsBetter,
	parseFitnessValue,
} from "./fitness";

export type FitnessTest = {
	lowerIsBetter?: boolean;
	_id: string;
	name: string;
	unit: FitnessUnit;
	archived: boolean;
	revision: number;
};
export type FitnessSession = {
	eventId?: string;
	programId?: string;
	_id: string;
	testId: string;
	seasonId: string;
	date: string;
	notes: string;
	revision: number;
	resultCount: number;
};
export type FitnessResult = {
	operationKey?: string;
	testId: string;
	sessionId: string;
	seasonId: string;
	personId: string;
	date: string;
	value: number;
	notes: string;
};
export type FitnessRosterRow = {
	personId: string;
	name: string;
	result?: FitnessResult;
	stats?: FitnessSummary;
};
export type FitnessTrend = {
	id: string;
	label: string;
	points: { date: string; value: number }[];
	limited: boolean;
};
export type FitnessDraftEntry = {
	personId: string;
	value: string;
	notes: string;
};
export const fitnessTestNameError = (name: string): string | undefined =>
	!name.trim()
		? "Add a test name"
		: name.trim().length > 100
			? "Keep the test name to 100 characters"
			: undefined;
export const fitnessEntriesError = (
	unit: FitnessUnit,
	entries: FitnessDraftEntry[],
): string | undefined => {
	if (
		!entries.length ||
		entries.length > 25 ||
		new Set(entries.map((entry) => entry.personId)).size !== entries.length
	)
		return "Choose 1–25 different players";
	for (const entry of entries) {
		if (entry.notes.length > 1000)
			return "Keep player notes to 1,000 characters";
		try {
			if (
				parseFitnessValue(unit, entry.value) === undefined &&
				entry.notes.trim()
			)
				return "Add a result, or clear both result and note.";
		} catch (error) {
			return error instanceof Error ? error.message : "Enter a valid result.";
		}
	}
	return undefined;
};
export type FitnessTestInput = {
	lowerIsBetter?: boolean;
	testId?: string;
	revision?: number;
	name: string;
	unit: FitnessUnit;
};
export type FitnessSessionInput = {
	testId: string;
	seasonId: string;
	sessionId?: string;
	revision?: number;
	date: string;
	notes: string;
};
export type FitnessResultInput = {
	sessionId: string;
	revision: number;
	entries: FitnessDraftEntry[];
};
export type FitnessLogInput = {
	testId: string;
	eventId: string;
	personId: string;
	value: string;
	notes: string;
	operationKey: string;
};
export type FitnessState = {
	tests: FitnessTest[];
	sessions: FitnessSession[];
	results: FitnessResult[];
};
export type FitnessAction =
	| { type: "save-test"; id: string; input: FitnessTestInput }
	| {
			type: "archive-test";
			testId: string;
			revision: number;
			archived: boolean;
	  }
	| { type: "save-session"; id: string; input: FitnessSessionInput }
	| { type: "delete-session"; sessionId: string; revision: number }
	| { type: "save-results"; input: FitnessResultInput };

export const fitnessSummary = (
	unit: FitnessUnit,
	results: FitnessResult[],
	lowerIsBetter = unit === "time",
): FitnessSummary | undefined =>
	results.length
		? {
				count: results.length,
				total: results.reduce((sum, result) => sum + result.value, 0),
				best: results.reduce(
					(best, result) =>
						lowerIsBetter
							? Math.min(best, result.value)
							: Math.max(best, result.value),
					results.at(0)?.value ?? 0,
				),
			}
		: undefined;

const checkRevision = (current: number, expected?: number): void => {
	if (current !== expected)
		throw new Error("This record changed. Reopen it before saving.");
};
export const reduceFitness = (
	state: FitnessState,
	account: Account,
	data: AppData,
	action: FitnessAction,
): FitnessState => {
	if (!account.coachPrograms.length) throw new Error("Coach access required.");
	if (action.type === "save-test") {
		const previous = state.tests.find(
			(test) => test._id === action.input.testId,
		);
		const nameError = fitnessTestNameError(action.input.name);
		if (nameError) throw new Error(nameError);
		if (previous) {
			checkRevision(previous.revision, action.input.revision);
			if (previous.unit !== action.input.unit)
				throw new Error("Create another test to change the result type.");
			if (
				action.input.lowerIsBetter !== undefined &&
				fitnessLowerIsBetter(previous) !== action.input.lowerIsBetter
			)
				throw new Error("Create another test to change the scoring direction.");
		}
		const test: FitnessTest = {
			_id: action.id,
			name: action.input.name.trim(),
			unit: action.input.unit,
			lowerIsBetter: previous
				? fitnessLowerIsBetter(previous)
				: fitnessLowerIsBetter(action.input),
			archived: previous?.archived ?? false,
			revision: previous ? previous.revision + 1 : 0,
		};
		return {
			...state,
			tests: [...state.tests.filter((entry) => entry._id !== action.id), test],
		};
	}
	if (action.type === "archive-test") {
		const test = state.tests.find((entry) => entry._id === action.testId);
		if (!test) throw new Error("Test not found.");
		checkRevision(test.revision, action.revision);
		return {
			...state,
			tests: state.tests.map((entry) =>
				entry._id === action.testId
					? {
							...entry,
							archived: action.archived,
							revision: entry.revision + 1,
						}
					: entry,
			),
		};
	}
	if (action.type === "save-session") {
		const test = state.tests.find((entry) => entry._id === action.input.testId);
		if (!test || test.archived)
			throw new Error("Restore the test before editing sessions.");
		const season = data.seasons.find(
			(entry) => entry.id === action.input.seasonId,
		);
		if (
			!validDate(action.input.date) ||
			!season ||
			action.input.date < season.start ||
			action.input.date > season.end
		)
			throw new Error("Choose a date within the season.");
		if (action.input.notes.length > 2000)
			throw new Error("Keep session notes to 2,000 characters");
		const previous = state.sessions.find(
			(entry) => entry._id === action.input.sessionId,
		);
		if (
			state.sessions.some(
				(entry) =>
					entry.testId === test._id &&
					entry.date === action.input.date &&
					entry._id !== action.input.sessionId,
			)
		)
			throw new Error("A session already exists on this date.");
		if (
			previous &&
			(previous.testId !== test._id ||
				previous.seasonId !== action.input.seasonId)
		)
			throw new Error("Session does not belong to this test and season.");
		if (previous) checkRevision(previous.revision, action.input.revision);
		if (previous?.eventId && previous.date !== action.input.date)
			throw new Error("Practice-linked results keep the practice date.");
		const session: FitnessSession = {
			eventId: previous?.eventId,
			programId: previous?.programId,
			_id: action.id,
			testId: test._id,
			seasonId: action.input.seasonId,
			date: action.input.date,
			notes: action.input.notes.trim(),
			revision: previous ? previous.revision + 1 : 0,
			resultCount: previous?.resultCount ?? 0,
		};
		return {
			...state,
			sessions: [
				...state.sessions.filter((entry) => entry._id !== action.id),
				session,
			],
			results: state.results.map((entry) =>
				entry.sessionId === session._id
					? { ...entry, date: session.date }
					: entry,
			),
		};
	}
	const sessionId =
		action.type === "save-results" ? action.input.sessionId : action.sessionId;
	const session = state.sessions.find((entry) => entry._id === sessionId);
	if (!session) throw new Error("Session not found.");
	checkRevision(
		session.revision,
		action.type === "save-results" ? action.input.revision : action.revision,
	);
	if (action.type === "delete-session")
		return {
			...state,
			sessions: state.sessions.filter((entry) => entry._id !== sessionId),
			results: state.results.filter((entry) => entry.sessionId !== sessionId),
		};
	const test = state.tests.find((entry) => entry._id === session.testId);
	if (!test || test.archived)
		throw new Error("Restore the test before editing results.");
	const entryError = fitnessEntriesError(test.unit, action.input.entries);
	if (entryError) throw new Error(entryError);
	const changed = action.input.entries.flatMap((entry): FitnessResult[] => {
		const person = data.members.find((member) => member.id === entry.personId);
		if (!person) throw new Error("Player not found.");
		if (person.mergedInto)
			throw new Error("This profile was merged. Reopen the current roster.");
		const value = parseFitnessValue(test.unit, entry.value);
		return value === undefined
			? []
			: [
					{
						testId: test._id,
						sessionId,
						seasonId: session.seasonId,
						personId: entry.personId,
						date: session.date,
						value,
						notes: entry.notes.trim(),
					},
				];
	});
	const results = [
		...state.results.filter(
			(entry) =>
				entry.sessionId !== sessionId ||
				!action.input.entries.some(
					(change) => change.personId === entry.personId,
				),
		),
		...changed,
	];
	const resultCount = results.filter(
		(entry) => entry.sessionId === sessionId,
	).length;
	if (resultCount > 500)
		throw new Error("A session supports up to 500 players.");
	return {
		...state,
		results,
		sessions: state.sessions.map((entry) =>
			entry._id === sessionId
				? { ...entry, resultCount, revision: entry.revision + 1 }
				: entry,
		),
	};
};
