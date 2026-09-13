import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { selectedPersonAtom, useActivePerson, useApp } from "../demo/app-state";
import {
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { householdMembers } from "../domain/home";

export const AccountHousehold = (): ReactElement => {
	const { data, account } = useApp();
	const active = useActivePerson();
	const select = useSetAtom(selectedPersonAtom);
	return (
		<Stack gap="sm">
			<SectionHeading size="small">Household access</SectionHeading>
			<Surface padding="xs">
				<List>
					{householdMembers(data, account).map((person) => (
						<ListItem
							key={person.id}
							title={person.name}
							description={`${person.id === account.personId ? "You" : "Linked child"}${person.id === active.id ? " · Selected" : ""}`}
							avatar={person.name}
							onPress={(): void => select(person.id)}
						/>
					))}
				</List>
			</Surface>
			<Text variant="small" tone="secondary">
				These are the people you can manage. Contact a club administrator to
				update household access.
			</Text>
		</Stack>
	);
};
