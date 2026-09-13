"use client";

import { useRef, useState } from "react";

export const useFormTask = (): {
	busy: boolean;
	error?: string;
	submit: (
		validate: () => string | undefined,
		action: () => Promise<void>,
	) => Promise<boolean>;
} => {
	const running = useRef(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	return {
		busy,
		error,
		submit: async (validate, action): Promise<boolean> => {
			if (running.current) return false;
			const validationError = validate();
			setError(validationError);
			if (validationError) return false;
			running.current = true;
			setBusy(true);
			try {
				await action();
				return true;
			} catch (failure) {
				setError(
					failure instanceof Error
						? failure.message
						: "Could not connect. Please try again.",
				);
				return false;
			} finally {
				running.current = false;
				setBusy(false);
			}
		},
	};
};
