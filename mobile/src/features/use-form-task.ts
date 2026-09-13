import { useState } from "react";
import { useTask } from "./use-task";

export const useFormTask = (): ReturnType<typeof useTask> & {
	submit: (
		validate: () => string | undefined,
		action: () => Promise<void>,
	) => Promise<boolean>;
} => {
	const task = useTask();
	const [validationError, setValidationError] = useState<string>();
	return {
		...task,
		error: task.busy ? undefined : (validationError ?? task.error),
		clear: (): void => {
			setValidationError(undefined);
			task.clear();
		},
		submit: async (validate, action): Promise<boolean> => {
			if (task.busy) return false;
			const error = validate();
			setValidationError(error);
			if (error) {
				task.clear();
				return false;
			}
			return task.run(action);
		},
	};
};
