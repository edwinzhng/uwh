import type { TeamPlan } from "../domain/app-types";
import {
	editLineup,
	type LineupEdit,
	type LineupSnapshot,
	lineupSnapshot,
	normalizeLineup,
	saveLineup,
	validateLineup,
} from "../domain/lineup";

export type LineupDraft = {
	base: TeamPlan;
	saved: LineupSnapshot;
	history: LineupSnapshot[];
};

export const initialLineupDraft = (base: TeamPlan): LineupDraft => {
	const saved = lineupSnapshot(base);
	const snapshot = validateLineup(base, saved)
		? lineupSnapshot(normalizeLineup(base))
		: saved;
	return { base, saved, history: [snapshot] };
};

export const currentLineupSnapshot = (draft: LineupDraft): LineupSnapshot =>
	draft.history.at(-1) ?? draft.saved;
export const lineupDraftChanged = (draft: LineupDraft): boolean =>
	JSON.stringify(currentLineupSnapshot(draft)) !== JSON.stringify(draft.saved);
export const receiveLineupPlan = (
	draft: LineupDraft,
	latest: TeamPlan,
): LineupDraft => {
	if (
		lineupDraftChanged(draft) ||
		(latest.revision ?? 0) < (draft.base.revision ?? 0) ||
		JSON.stringify(latest) === JSON.stringify(draft.base)
	)
		return draft;
	return initialLineupDraft(latest);
};

export const stageLineupEdit = (
	draft: LineupDraft,
	edit: LineupEdit,
): LineupDraft => {
	const previous = currentLineupSnapshot(draft);
	const snapshot = editLineup(draft.base, previous, edit);
	return JSON.stringify(snapshot) === JSON.stringify(previous)
		? draft
		: { ...draft, history: [...draft.history.slice(-49), snapshot] };
};

export const undoLineupEdit = (draft: LineupDraft): LineupDraft =>
	draft.history.length > 1
		? { ...draft, history: draft.history.slice(0, -1) }
		: draft;
export const commitLineupDraft = (draft: LineupDraft): LineupDraft =>
	initialLineupDraft(
		saveLineup(
			draft.base,
			currentLineupSnapshot(draft),
			draft.base.revision ?? 0,
		),
	);

export const receiveGeneratedLineup = (
	draft: LineupDraft,
	latest: TeamPlan,
	revision: number,
): LineupDraft =>
	(latest.revision ?? 0) >= revision && (draft.base.revision ?? 0) < revision
		? initialLineupDraft(latest)
		: draft;
