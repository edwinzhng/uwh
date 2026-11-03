import type { AppAction } from "./app-types";
import { programDraft } from "./programs";

export type ProgramCommand = Extract<AppAction, { type: "save-program" }>;
export const programCommandPayload = (action: ProgramCommand): string =>
	JSON.stringify({
		draft: programDraft({ ...action.draft, revision: 0 }),
		expectedRevision: action.expectedRevision,
		memberIds: action.memberIds.slice().sort(),
	});
export const validateProgramRequestId = (requestId: string): void => {
	if (!/^[a-zA-Z0-9_:-]{6,120}$/.test(requestId))
		throw new Error("Choose a valid program request ID.");
};
