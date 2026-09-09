import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select, Stack } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import { CalendarSubscription } from "./calendar-subscription";

export const CalendarSettings = (): ReactElement => {
	const { data, account, source } = useApp();
	const active = useActivePerson();
	const [selected, setSelected] = useState<string>();
	const people = data.members.filter((person) =>
		canManagePerson(account, person.id),
	);
	const person = people.find((entry) => entry.id === selected) ?? active;
	return (
		<Stack gap="md">
			<Select
				label="Calendar for"
				value={person.id}
				options={people.map((entry) => ({
					value: entry.id,
					label: `${entry.name}${entry.id === account.personId ? " · You" : " · Child"}`,
				}))}
				onValueChange={setSelected}
			/>
			<CalendarSubscription
				key={`${source}:${account.id}:${person.id}`}
				person={person}
			/>
		</Stack>
	);
};
