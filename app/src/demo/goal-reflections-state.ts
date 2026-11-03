import { atom } from "jotai";
import { canReadProgress } from "../domain/app-rules";
import {
	type GoalReflection,
	type GoalReflectionDraft,
	reflectionMatches,
	validateGoalReflection,
} from "../domain/goal-reflections";
import { previewAccountAtom, previewDataAtom } from "./app-state";

export const previewGoalReflectionsAtom = atom<
	(GoalReflection & { authorId: string; requestId: string })[]
>([]);

export const previewGoalReflectionCommandAtom = atom(
	undefined,
	(get, set, draft: GoalReflectionDraft): void => {
		const account = get(previewAccountAtom);
		if (account.personId !== draft.personId)
			throw new Error("Only the player can record their own reflection.");
		if (draft.requestId.length < 16 || draft.requestId.length > 100)
			throw new Error("Reopen the check-in and try again.");
		const history = get(previewGoalReflectionsAtom);
		const previous = history.find(
			(entry) =>
				entry.authorId === account.id && entry.requestId === draft.requestId,
		);
		if (previous) {
			if (
				!reflectionMatches(previous, draft) ||
				previous.personId !== draft.personId
			)
				throw new Error(
					"This check-in was already recorded. Reopen to record another.",
				);
			return;
		}
		const error = validateGoalReflection(draft);
		if (error) throw new Error(error);
		const data = get(previewDataAtom);
		const member = data.members.find((entry) => entry.id === draft.personId);
		if (!member || !canReadProgress(account, member) || member.archived)
			throw new Error("Player unavailable.");
		if (
			member.goal !== draft.goal ||
			(draft.goalRevision !== undefined &&
				draft.goalRevision !== (member.goalRevision ?? 0))
		)
			throw new Error(
				"Your goal changed. Reopen the check-in to review the current goal.",
			);
		if (member.steps !== draft.expectedSteps)
			throw new Error(
				"Your check-in count changed. Review the current progress and try again.",
			);
		const checkIn = Math.min(6, member.steps + 1);
		set(previewGoalReflectionsAtom, [
			...history,
			{
				id: draft.requestId,
				personId: member.id,
				authorId: account.id,
				requestId: draft.requestId,
				goal: draft.goal,
				goalDetails: member.goalDetails,
				goalRevision: member.goalRevision ?? 0,
				note: draft.note.trim(),
				selfRating: draft.selfRating,
				createdAt: Date.now(),
				checkIn,
			},
		]);
		set(previewDataAtom, {
			...data,
			members: data.members.map((entry) =>
				entry.id === member.id ? { ...entry, steps: checkIn } : entry,
			),
		});
	},
);
