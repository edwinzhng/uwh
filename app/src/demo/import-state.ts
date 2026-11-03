import { atom, useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import type {
	ImportBatch,
	ImportJobController,
	ImportJobInput,
} from "../backend/use-import-job";
import {
	commitPreviewImport,
	type PreviewImportState,
	previewImportPlans,
} from "../domain/preview-import";
import { useTask } from "../features/use-task";
import { newId, previewAccountAtom, previewDataAtom } from "./app-state";
import { previewSeasonLedgerAtom } from "./season-ledger-state";

export type ImportHistoryEntry = {
	id: string;
	source: string;
	kind: string;
	created: number;
	skipped: number;
	createdAt: number;
	actor: string;
};
const previewImportReferencesAtom = atom<PreviewImportState["references"]>({});
export const previewImportHistoryAtom = atom<ImportHistoryEntry[]>([]);
const previewImportStateAtom = atom(
	(get): PreviewImportState => ({
		data: get(previewDataAtom),
		records: get(previewSeasonLedgerAtom).records,
		references: get(previewImportReferencesAtom),
	}),
);
const applyPreviewImportAtom = atom(
	undefined,
	(get, set, request: { input: ImportJobInput; expected: string }): void => {
		const actor = get(previewAccountAtom);
		const current = get(previewImportStateAtom);
		const plans = previewImportPlans(current, request.input);
		const next = commitPreviewImport(
			current,
			actor,
			request.input,
			request.expected,
		);
		set(previewDataAtom, next.data);
		set(previewSeasonLedgerAtom, {
			...get(previewSeasonLedgerAtom),
			records: next.records,
		});
		set(previewImportReferencesAtom, next.references);
		set(previewImportHistoryAtom, (history) => [
			{
				id: newId(),
				source: request.input.source,
				kind: request.input.kind,
				created: plans.filter((plan) => plan.status === "create").length,
				skipped: plans.filter((plan) => plan.status !== "create").length,
				createdAt: Date.now(),
				actor: actor.name,
			},
			...history,
		]);
	},
);
const previewBatches = (
	state: PreviewImportState,
	input: ImportJobInput,
): ImportBatch[] => {
	const ids = input.rows.map((row) => row.source_id?.trim());
	if (new Set(ids).size !== ids.length)
		throw new Error("Each row needs a unique source ID.");
	return Array.from(
		{ length: Math.ceil(input.rows.length / 25) },
		(_, index) => {
			const rows = input.rows.slice(index * 25, (index + 1) * 25);
			const plans = previewImportPlans(state, { ...input, rows });
			return {
				rows,
				key: newId(),
				preview: { plans, signature: JSON.stringify(plans) },
			};
		},
	);
};

export const usePreviewImportJob = (
	initial?: ImportJobInput,
): ImportJobController => {
	const state = useAtomValue(previewImportStateAtom);
	const commitBatch = useSetAtom(applyPreviewImportAtom);
	const task = useTask();
	const [input, setInput] = useState(initial);
	const [batches, setBatches] = useState<ImportBatch[]>(() =>
		initial ? previewBatches(state, initial) : [],
	);
	const [completed, setCompleted] = useState(0);
	const [done, setDone] = useState(false);
	const reset = (): void => {
		setBatches([]);
		setInput(undefined);
		setCompleted(0);
		setDone(false);
		task.clear();
	};
	return {
		batches,
		busy: task.busy,
		completed,
		error: task.error,
		done,
		reset,
		preview: async (next): Promise<void> => {
			await task.run(async (): Promise<void> => {
				const planned = previewBatches(state, next);
				setBatches(planned);
				setInput(next);
				setCompleted(0);
				setDone(false);
			});
		},
		commit: async (): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				if (!input || !batches.length)
					throw new Error("Preview the import first.");
				if (done) return;
				for (const [index, batch] of batches.entries()) {
					if (index < completed) continue;
					commitBatch({
						input: { ...input, rows: batch.rows },
						expected: batch.preview.signature,
					});
					setCompleted(index + 1);
				}
				setDone(true);
			}),
	};
};
