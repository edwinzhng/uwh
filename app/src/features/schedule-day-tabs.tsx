import { useQuery } from "convex/react";
import { type ReactElement, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Tabs, usePageLoading } from "../design-system";
import { scheduledWeekdays, weekdayLabels } from "../domain/schedule-weekdays";

type Props = { value?: number; now: number; onChange: (day?: number) => void };
const DayTabs = ({
	days,
	value,
	onChange,
}: Omit<Props, "now"> & { days: number[] }): ReactElement => (
	<Tabs
		label="Days"
		value={value === undefined ? "all" : String(value)}
		options={[
			{ value: "all", label: "All" },
			...days.map((day) => ({
				value: String(day),
				label: weekdayLabels.at(day) ?? "",
			})),
		]}
		onValueChange={(value): void =>
			onChange(value === "all" ? undefined : Number(value))
		}
	/>
);
const LiveDayTabs = (props: Props): ReactElement => {
	const days = useQuery(api.schedule_agenda.weekdays, { now: props.now });
	const retained = useRef(days);
	if (days !== undefined) retained.current = days;
	usePageLoading(retained.current === undefined);
	return (
		<DayTabs
			value={props.value}
			onChange={props.onChange}
			days={days ?? retained.current ?? []}
		/>
	);
};
export const ScheduleDayTabs = (props: Props): ReactElement => {
	const { source, data, workspaceId, account } = useApp();
	return source === "convex" ? (
		<LiveDayTabs
			key={`${workspaceId}:${account.id}`}
			value={props.value}
			now={props.now}
			onChange={props.onChange}
		/>
	) : (
		<DayTabs
			value={props.value}
			onChange={props.onChange}
			days={scheduledWeekdays(data.events, props.now)}
		/>
	);
};
