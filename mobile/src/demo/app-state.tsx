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
import { clubDate } from "../domain/event-time";
import { canDiscussSession } from "../domain/session-discussion";
import { syncSeriesResponses } from "../domain/session-series";
import { initialAppData, previewAccounts, primaryAccount } from "./app-data";
import { previewSessionSeries } from "./session-series-state";

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
		if (action.type === "edit-event") {
			const previous = get(previewDataAtom);
			const next = reduceApp(previous, get(previewAccountAtom), action);
			const series = get(previewSessionSeries).map((entry) => ({
				...entry,
				seriesIds: [
					...new Set([
						...entry.seriesIds,
						...next.events
							.filter((event) =>
								previous.events.some(
									(before) =>
										before.id === event.id &&
										before.seriesId &&
										entry.seriesIds.includes(before.seriesId),
								),
							)
							.flatMap((event) => (event.seriesId ? [event.seriesId] : [])),
					]),
				],
			}));
			set(previewSessionSeries, series);
			set(previewDataAtom, {
				...next,
				responses: series.reduce(
					(responses, entry) =>
						syncSeriesResponses(
							entry,
							next.events,
							responses,
							clubDate(undefined, next.timeZone),
							Date.now(),
						),
					next.responses,
				),
			});
			return;
		}
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
	const storedData = useAtomValue(previewDataAtom);
	const allData: AppData = {
		...storedData,
		conversations: storedData.conversations.map((thread) => {
			if (!thread.eventId) return thread;
			const event = storedData.events.find(
				(entry) => entry.id === thread.eventId,
			);
			return {
				...thread,
				accountIds: event
					? previewAccounts
							.filter((entry) =>
								canDiscussSession(entry, event, storedData.members),
							)
							.map((entry) => entry.id)
					: [],
			};
		}),
	};
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
