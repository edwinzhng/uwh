import type { AppAction } from "./app-types";

export const actionPeople = (action: AppAction): string[] => {
	if ("personId" in action) return [action.personId];
	switch (action.type) {
		case "save-program":
			return action.memberIds;
		case "add-member":
			return [action.member.id];
		case "save-feedback":
			return [action.feedback.personId];
		case "payment":
			return [action.payment.personId];
		case "issue":
			return [action.loan.personId];
		case "create-event":
		case "edit-event":
			return [
				...(action.draft.eligiblePersonIds ?? []),
				...(action.draft.tournamentRoster ?? []).map((entry) => entry.personId),
			];
		case "generate-teams":
			return action.excludedPersonIds ?? [];
		case "save-lineup":
			return [
				...action.snapshot.black,
				...action.snapshot.white,
				...action.snapshot.blackBench,
				...action.snapshot.whiteBench,
				...action.snapshot.positions.map((entry) => entry.personId),
				...(action.snapshot.fieldSlots ?? []).map((entry) => entry.personId),
				...(action.snapshot.rotationSlots ?? []).map((entry) => entry.personId),
				...(action.snapshot.referees ?? []).map((entry) => entry.personId),
			];
		default:
			return [];
	}
};
