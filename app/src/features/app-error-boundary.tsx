import type { ErrorBoundaryProps } from "expo-router";
import { Provider } from "jotai";
import type { ReactElement } from "react";
import { DesignProvider } from "../design-system";
import { ScreenErrorBoundary } from "./screen-error-boundary";

export const AppErrorBoundary = ({
	error,
	retry,
}: ErrorBoundaryProps): ReactElement => (
	<Provider>
		<DesignProvider>
			<ScreenErrorBoundary error={error} retry={retry} />
		</DesignProvider>
	</Provider>
);
