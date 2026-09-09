import { useRef, useState } from "react";
import { friendlyError } from "../backend/errors";

export const useTask = (): {
	busy: boolean;
	error?: string;
	clear: () => void;
	run: (action: () => Promise<void>) => Promise<boolean>;
} => {
	const [busy, setBusy] = useState(false);
	const running = useRef(false);
	const [error, setError] = useState<string>();
	return {
		busy,
		error,
		clear: (): void => setError(undefined),
		run: async (action): Promise<boolean> => {
			if (running.current) return false;
			running.current = true;
			setBusy(true);
			setError(undefined);
			try {
				await action();
				return true;
			} catch (error) {
				setError(friendlyError(error));
				return false;
			} finally {
				running.current = false;
				setBusy(false);
			}
		},
	};
};
