import type { ErrorBoundaryProps } from "expo-router";
import { type ReactElement, useContext, useEffect } from "react";
import { ScreenErrorReport } from "../backend/screen-error-report";
import { AppContext } from "../demo/app-state";
import { RecoveryScreen } from "../design-system";
import { useTask } from "./use-task";

export const ScreenErrorBoundary = ({
	error,
	retry,
}: ErrorBoundaryProps): ReactElement => {
	const task = useTask();
	const app = useContext(AppContext);
	useEffect((): void => {
		console.error(error);
	}, [error]);
	return (
		<>
			{app?.source === "convex" ? (
				<ScreenErrorReport error={error} />
			) : undefined}
			<RecoveryScreen
				isRetrying={task.busy}
				onRetry={(): void => {
					void task.run(retry);
				}}
			/>
		</>
	);
};
