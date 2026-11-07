import { useLocalSearchParams, useRoute, useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { selectedPersonAtom, useActivePerson, useApp } from "../demo/app-state";
import { PersonPicker } from "../design-system";
import { canCoach, canManagePerson } from "../domain/app-rules";
import { isAccountDestination, pagePathname } from "../domain/page-navigation";
import { homeView, homeWorkspaceAtom } from "./home-workspace-state";
import { SignOutConfirmation } from "./sign-out-confirmation";

export const FamilyMenu = (): ReactElement => {
	const [signOutOpen, setSignOutOpen] = useState(false);
	const { data, account } = useApp();
	const active = useActivePerson();
	const select = useSetAtom(selectedPersonAtom);
	const router = useRouter();
	const pathname = pagePathname(useRoute().name);
	const { view } = useLocalSearchParams<{ view?: string }>();
	const [workspaces, setWorkspaces] = useAtom(homeWorkspaceAtom);
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
					canCoach(account)
						? {
								value: homeView(
									true,
									pathname === "/" ? view : undefined,
									workspaces[account.id],
								),
								onValueChange: (next): void => {
									setWorkspaces((current) => ({
										...current,
										[account.id]: next,
									}));
									if (pathname === "/") router.setParams({ view: next });
									else
										router.navigate({ pathname: "/", params: { view: next } });
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
