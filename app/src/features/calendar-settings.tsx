import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Avatar, Button, Disclosure, Row, Stack, Text } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import { isHostedCalendarOrigin } from "../domain/calendar-links";
import { CalendarDownload } from "./calendar-download";
import { calendarOrigin } from "./calendar-origin";
import { CalendarSubscriptions } from "./calendar-subscriptions";

export const CalendarSettings = ({
	selected,
	busy,
	onPeopleChange,
	onBusyChange,
}: {
	selected: string[];
	busy: boolean;
	onPeopleChange: (ids: string[]) => void;
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
			{people.length > 1 ? (
				<Row wrap gap="xxs">
					{people.map((person) => (
						<Button
							key={person.id}
							label={person.name}
							leading={
								<Avatar compact name={person.name} personId={person.id} />
							}
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
			) : undefined}
			{!chosen.length ? (
				<Text variant="small" tone="secondary">
					Choose at least one profile.
				</Text>
			) : (
				<>
					{subscriptionsAvailable ? (
						<>
							<Text variant="small" tone="secondary">
								Upcoming practices appear as tentative until you respond Yes. To
								change an RSVP, open the event in UWH Club.
							</Text>
							<CalendarSubscriptions
								people={chosen}
								onBusyChange={onBusyChange}
							/>
						</>
					) : undefined}
					{subscriptionsAvailable ? (
						<Disclosure title="Download a copy" isDisabled={busy}>
							<CalendarDownload people={chosen} />
						</Disclosure>
					) : (
						<CalendarDownload people={chosen} />
					)}
				</>
			)}
		</Stack>
	);
};
