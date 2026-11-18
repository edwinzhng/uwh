import { atom } from "jotai";
import type { Account } from "../domain/app-types";

export type HomeView = "personal" | "coaching";

export const roleViewAtom = atom<Record<string, HomeView>>({});

export const canSwitchRoleView = (
	account: Pick<Account, "coachPrograms">,
): boolean => account.coachPrograms.length > 0;

export const roleView = (
	account: Pick<Account, "coachPrograms">,
	savedView: HomeView | undefined,
): HomeView =>
	canSwitchRoleView(account) && savedView === "personal"
		? "personal"
		: "coaching";

export const playerAccount = (account: Account): Account => ({
	...account,
	coachPrograms: [],
	admin: false,
});
