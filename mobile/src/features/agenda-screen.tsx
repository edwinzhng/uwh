import { atom, useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Row,
	SegmentedControl,
	Select,
	Surface,
} from "../design-system";
import { clubDate, clubTimestamp } from "../domain/event-time";
import { CalendarSyncButton } from "./calendar-sync-button";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { ScheduleCalendar } from "./schedule-calendar";
import { SchedulePage } from "./schedule-page";

const viewAtom = atom<"upcoming" | "calendar" | "past">("upcoming");
const dateAtom = atom<string>();

export const AgendaScreen = (): ReactElement => {
	const { data, account } = useApp();
	const [view, setView] = useAtom(viewAtom);
	const [selectedDate, setSelectedDate] = useAtom(dateAtom);
	const [create, setCreate] = useState(false);
	const [season, setSeason] = useState("all");
	const [now] = useState(Date.now);
	const today = clubDate(now);
	const allEvents = data.events
		.filter(
			(event) => season === "all" || (event.seasonId ?? "2026-2027") === season,
		)
		.toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
	const date =
		selectedDate ??
		allEvents.find((event) => event.date >= today && !event.cancelled)?.date ??
		today;
	const events = allEvents.filter((event) =>
		view === "calendar"
			? event.date === date
			: view === "past"
				? clubTimestamp(event.date, event.end) <= now
				: clubTimestamp(event.date, event.end) > now,
	);
	const ordered = view === "past" ? events.toReversed() : events;
	const counts = allEvents
		.filter((event) => !event.cancelled)
		.reduce<Record<string, number>>((counts, event) => {
			counts[event.date] = (counts[event.date] ?? 0) + 1;
			return counts;
		}, {});
	return (
		<ClubShell
			title="Schedule"
			action={
				<Row gap="xs" wrap>
					<CalendarSyncButton />
					{account.admin ? (
						<Button
							label="New event"
							staffRole="admin"
							prefix="plus"
							onPress={(): void => setCreate(true)}
						/>
					) : undefined}
				</Row>
			}
		>
			<Row justify="between" wrap>
				<Select
					label="Season"
					value={season}
					options={[
						{ value: "all", label: "All seasons" },
						...data.seasons.map((season) => ({
							value: season.id,
							label: season.name,
						})),
					]}
					onValueChange={(value): void => setSeason(value ?? "all")}
				/>
				<SegmentedControl
					label="Schedule view"
					hideLabel
					value={view}
					onValueChange={setView}
					options={[
						{ value: "upcoming", label: "Upcoming" },
						{ value: "calendar", label: "Calendar" },
						{ value: "past", label: "Past" },
					]}
				/>
			</Row>
			{view === "calendar" ? (
				<Surface>
					<ScheduleCalendar
						date={date}
						season={season}
						today={today}
						counts={counts}
						onChange={setSelectedDate}
					/>
				</Surface>
			) : undefined}
			<SchedulePage
				view={view}
				date={date}
				season={season}
				now={now}
				preview={ordered}
			/>
			{account.admin && create ? (
				<EventEditor
					key={`new-${view === "calendar" ? date : today}`}
					open={create}
					initialDate={view === "calendar" ? date : today}
					onClose={(): void => setCreate(false)}
				/>
			) : undefined}
		</ClubShell>
	);
};
