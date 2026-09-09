import { atom, useAtomValue, useSetAtom } from "jotai";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { reduceApp } from "../domain/app-reducer";
import { canManagePerson } from "../domain/app-rules";
import type { Account, AppAction, AppData, Member } from "../domain/app-types";
import { visibleAppData } from "../domain/app-visibility";
import { initialAppData, previewAccounts, primaryAccount } from "./app-data";

export const previewDataAtom = atom<AppData>(initialAppData);
export const previewAccountIdAtom = atom("alex");
export const selectedPersonAtom = atom("alex");
export const previewAccountAtom = atom(
	(get): Account =>
		previewAccounts.find((entry) => entry.id === get(previewAccountIdAtom)) ??
		primaryAccount,
);
export const selectPreviewAccountAtom = atom(
	undefined,
	(_get, set, id: string): void => {
		const account = previewAccounts.find((entry) => entry.id === id);
		if (account) {
			set(previewAccountIdAtom, id);
			set(selectedPersonAtom, account.personId);
		}
	},
);
export const previewActionAtom = atom(
	undefined,
	(get, set, action: AppAction): void => {
		set(
			previewDataAtom,
			reduceApp(get(previewDataAtom), get(previewAccountAtom), action),
		);
	},
);
export const newId = (): string =>
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export type AppContextValue = {
	data: AppData;
	account: Account;
	accounts: Account[];
	source: "preview" | "convex";
	busy: boolean;
	loading?: boolean;
	error?: string;
	clearError: () => void;
	dispatch: (action: AppAction) => Promise<boolean>;
};
export const AppContext = createContext<AppContextValue | undefined>(undefined);
export const PreviewProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const allData = useAtomValue(previewDataAtom);
	const account = useAtomValue(previewAccountAtom);
	const act = useSetAtom(previewActionAtom);
	const [error, setError] = useState<string>();
	return (
		<AppContext.Provider
			value={{
				data: visibleAppData(allData, account),
				account,
				accounts: previewAccounts,
				source: "preview",
				busy: false,
				error,
				clearError: (): void => setError(undefined),
				dispatch: async (action): Promise<boolean> => {
					try {
						act(action);
						return true;
					} catch (error) {
						setError(
							error instanceof Error ? error.message : "Could not save.",
						);
						return false;
					}
				},
			}}
		>
			{children}
		</AppContext.Provider>
	);
};
export const useApp = (): AppContextValue => {
	const value = useContext(AppContext);
	if (!value) throw new Error("AppProvider is required.");
	return value;
};
export const useActivePerson = (): Member => {
	const { data, account } = useApp();
	const selected = useAtomValue(selectedPersonAtom);
	const personId = canManagePerson(account, selected)
		? selected
		: account.personId;
	const member = data.members.find((entry) => entry.id === personId);
	if (!member) throw new Error("Your profile is unavailable.");
	return member;
};
