import { atom, useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Row,
	SegmentedControl,
	Select,
	Surface,
	Tabs,
} from "../design-system";
import { clubDate, clubTimestamp, eventDates } from "../domain/event-time";
import { householdMembers, relevantHouseholdEvent } from "../domain/home";
import { CalendarExportButton } from "./calendar-export-button";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { ScheduleCalendar } from "./schedule-calendar";
import { SchedulePage } from "./schedule-page";

const viewAtom = atom<"upcoming" | "past">("upcoming");
const layoutAtom = atom<"list" | "calendar">("list");
const audienceAtom = atom<"household" | "all">("household");
const dateAtom = atom<string>();

export const AgendaScreen = (): ReactElement => {
	const { data, account } = useApp();
	const [audience, setAudience] = useAtom(audienceAtom);
	const [period, setPeriod] = useAtom(viewAtom);
	const [layout, setLayout] = useAtom(layoutAtom);
	const view = layout === "calendar" ? "calendar" : period;
	const [selectedDate, setSelectedDate] = useAtom(dateAtom);
	const [create, setCreate] = useState(false);
	const season = "all";
	const [now] = useState(Date.now);
	const today = clubDate(now, data.timeZone);
	const people = householdMembers(data, account);
	const allEvents = data.events
		.filter(
			(event) => audience === "all" || relevantHouseholdEvent(event, people),
		)
		.filter(
			(event) =>
				clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <=
					now ===
				(period === "past"),
		)
		.toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
	const date =
		selectedDate ??
		(period === "past" ? allEvents.at(-1)?.date : allEvents.at(0)?.date) ??
		today;
	const events = allEvents.filter(
		(event) => layout !== "calendar" || eventDates(event).includes(date),
	);
	const ordered = period === "past" ? events.toReversed() : events;
	const counts = allEvents
		.filter((event) => !event.cancelled)
		.flatMap(eventDates)
		.reduce<Record<string, number>>((counts, date) => {
			counts[date] = (counts[date] ?? 0) + 1;
			return counts;
		}, {});
	return (
		<ClubShell
			title="Schedule"
			tabs={
				<Tabs
					page
					label="Schedule period"
					hideLabel
					value={period}
					onValueChange={(value): void => {
						setPeriod(value);
						setSelectedDate(undefined);
					}}
					options={[
						{ value: "upcoming", label: "Upcoming" },
						{ value: "past", label: "Past" },
					]}
				/>
			}
			action={
				<Row gap="xs" wrap>
					<CalendarExportButton />
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
					label="Show events for"
					value={audience}
					onValueChange={(value): void => {
						if (value) {
							setAudience(value);
							setSelectedDate(undefined);
						}
					}}
					options={[
						{ value: "household", label: "My household" },
						{ value: "all", label: "All club" },
					]}
				/>
				<SegmentedControl
					label="Schedule layout"
					hideLabel
					variant="icons"
					value={layout}
					onValueChange={setLayout}
					options={[
						{ value: "list", label: "List", icon: "list" },
						{ value: "calendar", label: "Calendar", icon: "calendar" },
					]}
				/>
			</Row>
			{view === "calendar" ? (
				<Surface>
					<ScheduleCalendar
						audience={audience}
						date={date}
						period={period}
						now={now}
						season={season}
						today={today}
						counts={counts}
						onChange={setSelectedDate}
					/>
				</Surface>
			) : undefined}
			<SchedulePage
				audience={audience}
				view={view}
				period={period}
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
