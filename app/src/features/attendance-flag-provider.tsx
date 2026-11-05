import { useMutation, useQuery } from "convex/react";
import { type ReactElement, type ReactNode, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Stack, Text } from "../design-system";
import type { ReportFlag } from "../domain/attendance-report";
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
				set: (personId, kind, partId): void => {
					void task.run(async (): Promise<void> => {
						await save({ eventId, personId, kind, partId });
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
const PreviewFlags = ({ children, eventId }: Props): ReactElement => {
	const { dispatch } = useApp();
	const task = useTask();
	const [flags, setFlags] = useState<ReportFlag[]>([]);
	return (
		<AttendanceFlagContext.Provider
			value={{
				flags,
				busy: task.busy,
				set: (personId, kind, partId): void => {
					void task.run(async (): Promise<void> => {
						if (
							kind === "addition" &&
							!(await dispatch({
								type: "attendance",
								eventId,
								personId,
								partId,
								attendance: "present",
								lateAddition: true,
							}))
						)
							throw new Error("Couldn’t add player. Try again.");
						setFlags((current) => [
							...current.filter((flag) => flag.personId !== personId),
							...(kind ? [{ eventId, personId, kind }] : []),
						]);
					});
				},
			}}
		>
			{children}
		</AttendanceFlagContext.Provider>
	);
};
export const AttendanceFlagProvider = ({
	eventId,
	children,
}: Props): ReactNode => {
	const { source, account } = useApp();
	return source === "convex" && account.coachPrograms.length ? (
		<LiveFlags eventId={eventId}>{children}</LiveFlags>
	) : (
		<PreviewFlags eventId={eventId}>{children}</PreviewFlags>
	);
};
