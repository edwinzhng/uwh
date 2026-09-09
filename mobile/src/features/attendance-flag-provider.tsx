import { useMutation, useQuery } from "convex/react";
import type { ReactElement, ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Stack, Text } from "../design-system";
import { AttendanceFlagContext } from "./attendance-flag-context";
import { useTask } from "./use-task";

type Props = { eventId: string; children: ReactNode };
const LiveFlags = ({ eventId, children }: Props): ReactElement => {
	const flags = useQuery(api.attendance_reports.eventFlags, { eventId });
	const save = useMutation(api.attendance_reports.setFlag);
	const task = useTask();
	return (
		<AttendanceFlagContext.Provider
			value={{
				flags: flags ?? [],
				busy: task.busy || !flags,
				set: (personId, kind): void => {
					void task.run(async (): Promise<void> => {
						await save({ eventId, personId, kind });
					});
				},
			}}
		>
			<Stack>
				{task.error ? (
					<Text tone="danger" variant="small">
						{task.error}
					</Text>
				) : undefined}
				{children}
			</Stack>
		</AttendanceFlagContext.Provider>
	);
};
export const AttendanceFlagProvider = ({
	eventId,
	children,
}: Props): ReactElement => {
	const { source, account } = useApp();
	return source === "convex" && account.coachPrograms.length ? (
		<LiveFlags eventId={eventId}>{children}</LiveFlags>
	) : (
		<>{children}</>
	);
};
