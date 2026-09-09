import { type ReactElement, useMemo, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Checkbox, FileDownload, Stack, Text } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import {
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../domain/calendar-export";
import { HouseholdCalendarDownload } from "./household-calendar-download";

export const CalendarSettings = (): ReactElement => {
	const { data, account, source } = useApp();
	const active = useActivePerson();
	const [selected, setSelected] = useState<string[]>([active.id]);
	const [error, setError] = useState<string>();
	const people = data.members.filter((person) =>
		canManagePerson(account, person.id),
	);
	const chosen = people.filter((person) => selected.includes(person.id));
	const snapshot = useMemo(
		() =>
			renderCalendar(
				data.clubName,
				chosen.flatMap((person) =>
					reconcileCalendar(
						[],
						personalCalendarEvents(
							data.events,
							data.responses,
							person.id,
							person.programs,
							false,
						).map((event) => ({
							...event,
							title: `${event.title} · ${person.name}`,
						})),
						data.clubName,
						person.id,
						Date.now(),
					),
				),
			),
		[chosen, data],
	);
	return (
		<Stack gap="md">
			<Stack gap="xs">
				<Text variant="label">Household members</Text>
				{people.map((person) => (
					<Checkbox
						key={person.id}
						label={`${person.name}${person.id === account.personId ? " · You" : ""}`}
						checked={selected.includes(person.id)}
						onChange={(checked): void =>
							setSelected((current) =>
								checked
									? [...current, person.id]
									: current.filter((id) => id !== person.id),
							)
						}
					/>
				))}
			</Stack>
			{chosen.length ? (
				source === "convex" ? (
					<HouseholdCalendarDownload
						personIds={chosen.map((person) => person.id)}
						onError={setError}
					/>
				) : (
					<FileDownload
						label="Download .ics"
						filename="club-calendar.ics"
						contents={snapshot}
						onError={setError}
					/>
				)
			) : (
				<Text variant="small" tone="secondary">
					Select at least one person.
				</Text>
			)}
			{error ? <Text tone="danger">{error}</Text> : undefined}
		</Stack>
	);
};
