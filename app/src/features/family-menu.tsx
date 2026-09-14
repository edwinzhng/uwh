import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { selectedPersonAtom, useActivePerson, useApp } from "../demo/app-state";
import { actionToast, PersonPicker } from "../design-system";
import { canManagePerson } from "../domain/app-rules";

export const FamilyMenu = (): ReactElement => {
	const backend = useBackend();
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
			onValueChange={(id): void => {
				if (id !== active.id) {
					select(id);
					actionToast("switchedProfile");
				}
			}}
			account={{
				onSignOut: backend.signOut
					? (): void => {
							void backend
								.signOut?.()
								.then((): void => actionToast("signedOut"))
								.catch((): void => actionToast("retryAction", "error"));
						}
					: undefined,
				onSettings: (): void => router.navigate("/account-settings"),
			}}
		/>
	);
};
