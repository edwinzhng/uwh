import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { newId } from "../demo/app-state";
import type { ImportKind, ImportRow } from "../domain/import-data";
import { friendlyError } from "./errors";

type Batch = {
	rows: ImportRow[];
	key: string;
	preview: FunctionReturnType<typeof api.imports.preview>;
};
type Input = {
	source: string;
	kind: ImportKind;
	seasonId: string;
	rows: ImportRow[];
};
export const useImportJob = (): {
	batches: Batch[];
	busy: boolean;
	completed: number;
	error?: string;
	done: boolean;
	reset: () => void;
	preview: (input: Input) => Promise<void>;
	commit: () => Promise<boolean>;
} => {
	const client = useConvex();
	const write = useMutation(api.imports.commit);
	const [input, setInput] = useState<Input>();
	const [batches, setBatches] = useState<Batch[]>([]);
	const [busy, setBusy] = useState(false);
	const [completed, setCompleted] = useState(0);
	const [error, setError] = useState<string>();
	const [done, setDone] = useState(false);
	const reset = (): void => {
		setBatches([]);
		setInput(undefined);
		setCompleted(0);
		setDone(false);
		setError(undefined);
	};
	const preview = async (input: Input): Promise<void> => {
		if (busy) return;
		reset();
		setBusy(true);
		setInput(input);
		try {
			const keys = input.rows.map((row) => row.source_id?.trim());
			if (new Set(keys).size !== keys.length)
				throw new Error("Each row needs a unique source ID.");
			const batches: Batch[] = [];
			for (const index of Array.from(
				{ length: Math.ceil(input.rows.length / 25) },
				(_, index) => index,
			)) {
				const rows = input.rows.slice(index * 25, (index + 1) * 25);
				const preview = await client.query(api.imports.preview, {
					...input,
					rows,
				});
				batches.push({ rows, key: newId(), preview });
				setBatches([...batches]);
			}
		} catch (error) {
			setError(friendlyError(error));
			setBatches([]);
		} finally {
			setBusy(false);
		}
	};
	const commit = async (): Promise<boolean> => {
		if (busy || !input || !batches.length) return false;
		setBusy(true);
		setError(undefined);
		try {
			for (const [index, batch] of batches.entries()) {
				if (index < completed) continue;
				await write({
					...input,
					rows: batch.rows,
					key: batch.key,
					expected: batch.preview.signature,
				});
				setCompleted(index + 1);
			}
			setDone(true);
			return true;
		} catch (error) {
			setError(
				`${friendlyError(error)} Saved batches are kept. Preview again to continue safely.`,
			);
			return false;
		} finally {
			setBusy(false);
		}
	};
	return { batches, busy, completed, error, done, reset, preview, commit };
};
