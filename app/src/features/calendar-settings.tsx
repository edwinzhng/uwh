import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	ContentRow,
	List,
	ListItem,
	Stack,
	Text,
} from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import { isHostedCalendarOrigin } from "../domain/calendar-links";
import {
	type CalendarView,
	calendarScopeLabel,
} from "../domain/calendar-workflow";
import { CalendarDownload } from "./calendar-download";
import { calendarOrigin } from "./calendar-origin";
import { CalendarPeople } from "./calendar-people";
import { CalendarSubscriptionChoice } from "./calendar-subscription-choice";
import { CalendarSubscriptions } from "./calendar-subscriptions";

export const CalendarSettings = ({
	view,
	selected,
	busy,
	onViewChange,
	onPeopleSave,
	onBack,
	onBusyChange,
}: {
	view: CalendarView;
	selected: string[];
	busy: boolean;
	onViewChange: (view: CalendarView) => void;
	onPeopleSave: (ids: string[]) => void;
	onBack: () => void;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const { data, account, source } = useApp();
	const people = data.members.filter((person) =>
		canManagePerson(account, person.id),
	);
	const chosen = people.filter((person) => selected.includes(person.id));
	const subscriptionsAvailable =
		source === "convex" && isHostedCalendarOrigin(calendarOrigin);
	return (
		<Stack gap="md">
			{view !== "choose" ? (
				<Button
					label="Back"
					prefix="arrowLeft"
					variant="ghost"
					isDisabled={busy}
					onPress={onBack}
				/>
			) : undefined}
			{view === "people" ? (
				<CalendarPeople
					people={people}
					selected={selected}
					onSave={onPeopleSave}
				/>
			) : (
				<>
					<ContentRow
						title={calendarScopeLabel(chosen)}
						description={
							chosen.length === 1 ? "Selected schedule" : "Selected schedules"
						}
						control={
							people.length > 1 || !chosen.length ? (
								<Button
									label="Change"
									variant="ghost"
									isDisabled={busy}
									onPress={(): void => onViewChange("people")}
								/>
							) : undefined
						}
					/>
					<Text variant="small" tone="secondary">
						Only sessions marked Yes are included. If you choose individual
						sections, only those times are added.
					</Text>
					{!chosen.length ? (
						<Text variant="small" tone="secondary">
							Choose whose schedule to add.
						</Text>
					) : view === "choose" ? (
						<List>
							{subscriptionsAvailable ? (
								<CalendarSubscriptionChoice
									people={chosen}
									onBusyChange={onBusyChange}
									onPrepared={(): void => onViewChange("subscribe")}
								/>
							) : undefined}
							<ListItem
								title="Download a copy"
								description="Save a one-time .ics file to your calendar."
								icon="download"
								onPress={(): void => {
									if (!busy) onViewChange("download");
								}}
							/>
						</List>
					) : view === "subscribe" && subscriptionsAvailable ? (
						<CalendarSubscriptions
							people={chosen}
							onBusyChange={onBusyChange}
							onCreateLink={(): void => onViewChange("choose")}
						/>
					) : view === "download" ? (
						<CalendarDownload people={chosen} />
					) : undefined}
				</>
			)}
		</Stack>
	);
};
