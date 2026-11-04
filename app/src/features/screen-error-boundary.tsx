import type { ErrorBoundaryProps } from "expo-router";
import { type ReactElement, useEffect } from "react";
import { RecoveryScreen } from "../design-system";
import { useTask } from "./use-task";

export const ScreenErrorBoundary = ({
	error,
	retry,
}: ErrorBoundaryProps): ReactElement => {
	const task = useTask();
	useEffect((): void => {
		console.error(error);
	}, [error]);
	return (
		<RecoveryScreen
			isRetrying={task.busy}
			onRetry={(): void => {
				void task.run(retry);
			}}
		/>
	);
};
