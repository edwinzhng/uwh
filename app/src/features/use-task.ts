import { useRef, useState } from "react";
import { friendlyError } from "../backend/errors";

import { actionToast, type ToastMessage } from "../design-system";

export const useTask = (
	success?: ToastMessage,
): {
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
				if (success) actionToast(success);
				return true;
			} catch (error) {
				setError(friendlyError(error));
				actionToast("retryAction", "error");
				return false;
			} finally {
				running.current = false;
				setBusy(false);
			}
		},
	};
};
