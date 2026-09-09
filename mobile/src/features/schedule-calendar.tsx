import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Calendar, calendarDays } from "../design-system";

type Props = {
	date: string;
	today: string;
	season: string;
	counts: Record<string, number>;
	onChange: (date: string) => void;
};
const LiveCalendar = ({
	date,
	today,
	season,
	onChange,
}: Props): ReactElement => {
	const days = calendarDays(date);
	const counts = useQuery(api.pages.calendar, {
		from: days.at(0) ?? date,
		to: days.at(-1) ?? date,
		season,
	});
	return (
		<Calendar
			value={date}
			today={today}
			counts={counts ?? {}}
			onValueChange={onChange}
		/>
	);
};
export const ScheduleCalendar = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveCalendar
			date={props.date}
			today={props.today}
			season={props.season}
			counts={props.counts}
			onChange={props.onChange}
		/>
	) : (
		<Calendar
			value={props.date}
			today={props.today}
			counts={props.counts}
			onValueChange={props.onChange}
		/>
	);
