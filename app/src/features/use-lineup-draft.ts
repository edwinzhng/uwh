import { atom, useAtom } from "jotai";
import { useEffect, useRef } from "react";
import type { TeamPlan } from "../domain/app-types";
import {
	initialLineupDraft,
	type LineupDraft,
	receiveGeneratedLineup,
	receiveLineupPlan,
} from "./lineup-editor-state";

const draftsAtom = atom<Record<string, LineupDraft>>({});

export const useLineupDraft = (
	key: string,
	plan: TeamPlan,
	resetRevision?: number,
): [LineupDraft, (update: (current: LineupDraft) => LineupDraft) => void] => {
	const [drafts, setDrafts] = useAtom(draftsAtom);
	const stored = drafts[key];
	const draft = stored
		? receiveLineupPlan(stored, plan)
		: initialLineupDraft(plan);
	const appliedReset = useRef<number | undefined>(undefined);
	useEffect(() => {
		if (stored && draft !== stored)
			setDrafts((current) => ({
				...current,
				[key]: receiveLineupPlan(current[key] ?? stored, plan),
			}));
	}, [stored, draft, key, plan, setDrafts]);
	useEffect(() => {
		if (
			resetRevision === undefined ||
			appliedReset.current === resetRevision ||
			(plan.revision ?? 0) < resetRevision
		)
			return;
		appliedReset.current = resetRevision;
		setDrafts((current) => {
			const previous = current[key];
			if (!previous) return current;
			const next = receiveGeneratedLineup(previous, plan, resetRevision);
			return next === previous ? current : { ...current, [key]: next };
		});
	}, [resetRevision, plan, key, setDrafts]);
	return [
		draft,
		(update): void =>
			setDrafts((current) => ({
				...current,
				[key]: update(
					current[key]
						? receiveLineupPlan(current[key], plan)
						: initialLineupDraft(plan),
				),
			})),
	];
};
