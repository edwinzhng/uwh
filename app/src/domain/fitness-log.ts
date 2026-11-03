import type { Account, AppData } from "./app-types";
import { canRegister } from "./event-eligibility";
import { practiceEvent } from "./event-types";
import { parseFitnessValue } from "./fitness";
import {
	type FitnessLogInput,
	type FitnessState,
	fitnessEntriesError,
	reduceFitness,
} from "./fitness-model";

export const logFitnessResult = (
	state: FitnessState,
	account: Account,
	data: AppData,
	input: FitnessLogInput,
	id: string,
): FitnessState => {
	if (!account.coachPrograms.length) throw new Error("Coach access required.");
	if (!input.operationKey || input.operationKey.length > 100)
		throw new Error("Invalid operation key.");
	const test = state.tests.find((entry) => entry._id === input.testId);
	const event = data.events.find((entry) => entry.id === input.eventId);
	const person = data.members.find((entry) => entry.id === input.personId);
	if (!test || test.archived) throw new Error("Choose an active test.");
	if (
		!event ||
		!practiceEvent(event) ||
		event.cancelled ||
		!person ||
		!canRegister(person, event)
	)
		throw new Error("Choose a practice and an eligible player.");
	const error = fitnessEntriesError(test.unit, [input]);
	if (error) throw new Error(error);
	const value = parseFitnessValue(test.unit, input.value);
	if (value === undefined) throw new Error("Add a result.");
	const season = data.seasons.find(
		(entry) => event.date >= entry.start && event.date <= entry.end,
	);
	if (!season) throw new Error("Choose a practice within a season.");
	const previous = state.sessions.find(
		(entry) => entry.testId === test._id && entry.date === event.date,
	);
	if (previous?.eventId && previous.eventId !== event.id)
		throw new Error(
			"This test already has results for another practice on this date.",
		);
	const sessionId = previous?._id ?? id;
	const existing = state.results.find(
		(entry) => entry.sessionId === sessionId && entry.personId === person.id,
	);
	if (existing) {
		if (
			existing.operationKey === input.operationKey &&
			existing.value === value &&
			existing.notes === input.notes.trim()
		)
			return state;
		throw new Error("A result is already recorded. Open the test to edit it.");
	}
	const withSession = previous
		? state
		: reduceFitness(state, account, data, {
				type: "save-session",
				id,
				input: {
					testId: test._id,
					seasonId: season.id,
					date: event.date,
					notes: "",
				},
			});
	const session = withSession.sessions.find((entry) => entry._id === sessionId);
	if (!session) throw new Error("Session not found.");
	const next = reduceFitness(withSession, account, data, {
		type: "save-results",
		input: { sessionId, revision: session.revision, entries: [input] },
	});
	return {
		...next,
		sessions: next.sessions.map((entry) =>
			entry._id === sessionId
				? { ...entry, eventId: event.id, programId: event.program }
				: entry,
		),
		results: next.results.map((entry) =>
			entry.sessionId === sessionId && entry.personId === person.id
				? { ...entry, operationKey: input.operationKey }
				: entry,
		),
	};
};
