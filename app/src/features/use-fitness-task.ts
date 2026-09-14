import { useRef, useState } from "react";
import { friendlyError } from "../backend/errors";
export const useFitnessTask = (): {
	busy: boolean;
	error: string | undefined;
	run: (task: () => Promise<void>) => Promise<void>;
} => {
	const pending = useRef(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const run = async (task: () => Promise<void>): Promise<void> => {
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError(undefined);
		try {
			await task();
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};
	return { busy, error, run };
};
