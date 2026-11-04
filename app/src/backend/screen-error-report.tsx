import { useMutation } from "convex/react";
import { type ReactElement, useEffect } from "react";
import { api } from "../../convex/_generated/api";

export const ScreenErrorReport = ({
	error,
}: {
	error: Error;
}): ReactElement | undefined => {
	const report = useMutation(api.client_errors.report);
	useEffect((): void => {
		void report({
			name: error.name,
			message: error.message,
			stack: error.stack ?? "",
		}).catch((): undefined => undefined);
	}, [error, report]);
	return undefined;
};
