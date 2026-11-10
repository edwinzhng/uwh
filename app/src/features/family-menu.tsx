import { useRoute, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { selectedPersonAtom, useActivePerson, useApp } from "../demo/app-state";
import { PersonPicker } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import {
	isAccountDestination,
	pagePathname,
	pageRoleTone,
} from "../domain/page-navigation";
import { useRoleViewChoice } from "./role-view-scope";
import { SignOutConfirmation } from "./sign-out-confirmation";

export const FamilyMenu = (): ReactElement => {
	const [signOutOpen, setSignOutOpen] = useState(false);
	const { data, account } = useApp();
	const active = useActivePerson();
	const select = useSetAtom(selectedPersonAtom);
	const router = useRouter();
	const pathname = pagePathname(useRoute().name);
	const choice = useRoleViewChoice();
	return (
		<>
			<PersonPicker
				isSelected={isAccountDestination(pathname)}
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
					}
				}}
				account={{
					onProfile: (): void => router.navigate("/account"),
					onSignOut: (): void => setSignOutOpen(true),
					onSettings: (): void => router.navigate("/account-settings"),
				}}
				views={
					choice
						? {
								value: choice.value,
								onValueChange: (next): void => {
									choice.onValueChange(next);
									if (next === "personal" && pageRoleTone(pathname))
										router.navigate("/");
								},
							}
						: undefined
				}
			/>
			{signOutOpen ? (
				<SignOutConfirmation onClose={(): void => setSignOutOpen(false)} />
			) : undefined}
		</>
	);
};
