import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { selectedPersonAtom, useActivePerson, useApp } from "../demo/app-state";
import { PersonPicker } from "../design-system";
import { canManagePerson } from "../domain/app-rules";

export const FamilyMenu = (): ReactElement => {
	const { data, account } = useApp();
	const active = useActivePerson();
	const select = useSetAtom(selectedPersonAtom);
	const router = useRouter();
	return (
		<PersonPicker
			value={active.id}
			options={data.members
				.filter((member) => canManagePerson(account, member.id))
				.map((member) => ({
					id: member.id,
					name: member.name,
					relationship: member.id === account.personId ? "You" : "Child",
				}))}
			onValueChange={select}
			account={{
				onSettings: (): void => router.navigate("/account"),
			}}
		/>
	);
};
