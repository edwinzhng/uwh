import { useMutation } from "convex/react";
import { type ReactElement, useEffect } from "react";
import { api } from "../../convex/_generated/api";

export const ScreenErrorReport = ({
	error,
	stack,
}: {
	error: Error;
	stack?: string;
}): ReactElement | undefined => {
	const report = useMutation(api.client_errors.report);
	useEffect((): void => {
		void report({
			name: error.name,
			message: error.message,
			stack: stack ?? error.stack ?? "",
		}).catch((): undefined => undefined);
	}, [error, stack, report]);
	return undefined;
};
