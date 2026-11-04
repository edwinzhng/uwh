import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Avatar, Button, List, Row, Stack, Text } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import { isHostedCalendarOrigin } from "../domain/calendar-links";
import type { CalendarView } from "../domain/calendar-workflow";
import { CalendarDownload } from "./calendar-download";
import { calendarOrigin } from "./calendar-origin";
import { CalendarSubscriptionChoice } from "./calendar-subscription-choice";
import { CalendarSubscriptions } from "./calendar-subscriptions";

export const CalendarSettings = ({
	view,
	selected,
	busy,
	onViewChange,
	onPeopleChange,
	onBack,
	onBusyChange,
}: {
	view: CalendarView;
	selected: string[];
	busy: boolean;
	onViewChange: (view: CalendarView) => void;
	onPeopleChange: (ids: string[]) => void;
	onBack: () => void;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const { data, account, source } = useApp();
	const people = data.members.filter(
		(person) =>
			canManagePerson(account, person.id) &&
			!person.archived &&
			!person.mergedInto,
	);
	const chosen = people.filter((person) => selected.includes(person.id));
	const subscriptionsAvailable =
		source === "convex" && isHostedCalendarOrigin(calendarOrigin);
	return (
		<Stack gap="sm">
			{view !== "choose" ? (
				<Button
					label="Back"
					prefix="arrowLeft"
					variant="ghost"
					isDisabled={busy}
					onPress={onBack}
				/>
			) : undefined}
			<Row wrap gap="xxs">
				{people.map((person) => (
					<Button
						key={person.id}
						label={person.name}
						leading={<Avatar compact name={person.name} personId={person.id} />}
						variant="selection"
						density="filter"
						round
						isSelected={selected.includes(person.id)}
						isDisabled={busy}
						onPress={(): void =>
							onPeopleChange(
								selected.includes(person.id)
									? selected.filter((id) => id !== person.id)
									: [...selected, person.id],
							)
						}
					/>
				))}
			</Row>
			{view !== "download" ? (
				<Text variant="small" tone="secondary">
					Calendar sessions are synced with your attendance responses.
				</Text>
			) : undefined}
			{!chosen.length ? (
				<Text variant="small" tone="secondary">
					Select at least one person.
				</Text>
			) : view === "choose" ? (
				<List>
					{subscriptionsAvailable ? (
						<CalendarSubscriptionChoice
							people={chosen}
							onBusyChange={onBusyChange}
							onPrepared={(): void => onViewChange("subscribe")}
						/>
					) : (
						<Button
							label="Sync calendar"
							prefix="calendar"
							onPress={(): void => onViewChange("subscribe")}
						/>
					)}
					<Button
						label="Download once"
						variant="ghost"
						onPress={(): void => {
							if (!busy) onViewChange("download");
						}}
					/>
				</List>
			) : view === "subscribe" ? (
				subscriptionsAvailable ? (
					<CalendarSubscriptions
						people={chosen}
						onBusyChange={onBusyChange}
						onCreateLink={(): void => onViewChange("choose")}
					/>
				) : (
					<Stack gap="sm">
						<Row wrap gap="xs">
							<Button
								label="Apple Calendar"
								prefix="calendar"
								variant="secondary"
								isDisabled
								onPress={(): void => undefined}
							/>
							<Button
								label="Google Calendar"
								prefix="calendar"
								variant="secondary"
								isDisabled
								onPress={(): void => undefined}
							/>
						</Row>
						<Text variant="caption" tone="secondary">
							{source === "convex"
								? "Calendar sync is unavailable right now. Try again later."
								: "Live sync is available in the connected club app. This local preview can’t create subscription links."}
						</Text>
					</Stack>
				)
			) : view === "download" ? (
				<CalendarDownload people={chosen} />
			) : undefined}
		</Stack>
	);
};
