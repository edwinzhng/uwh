import type { ErrorBoundaryProps } from "expo-router";
import type { ReactElement } from "react";
import { RecoveryScreen } from "../design-system";
import { useTask } from "./use-task";

export const ScreenErrorBoundary = ({
	retry,
}: ErrorBoundaryProps): ReactElement => {
	const task = useTask();
	return (
		<RecoveryScreen
			isRetrying={task.busy}
			onRetry={(): void => {
				void task.run(retry);
			}}
		/>
	);
};
