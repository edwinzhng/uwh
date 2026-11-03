import { atom, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { reduceApp } from "../domain/app-reducer";
import { canManagePerson } from "../domain/app-rules";
import type { Account, AppAction, AppData, Member } from "../domain/app-types";
import { visibleAppData } from "../domain/app-visibility";
import { clubDate } from "../domain/event-time";
import { householdDefault } from "../domain/household";
import { withManagedRooms } from "../domain/managed-rooms";
import { endMemberEnrollments } from "../domain/member-lifecycle";
import { canonicalMemberAccount } from "../domain/member-merge-identity";
import {
	programCommandPayload,
	validateProgramRequestId,
} from "../domain/program-command";
import { canDiscussSession } from "../domain/session-discussion";
import {
	reconcileSeriesEligibility,
	syncSeriesResponses,
} from "../domain/session-series";
import { initialAppData, previewAccounts, primaryAccount } from "./app-data";
import { withInitialPoll } from "./chat-poll-fixture";
import { previewHouseholdAccounts } from "./household-data";
import { previewAccountId, previewPersonId } from "./preview-personas";
import { previewResources } from "./resource-state";
import { reviewData } from "./review-data";
import { reviewScenarioData } from "./review-scenario";
import { previewSessionSeries } from "./session-series-state";

const initialPreviewData = withManagedRooms(
	withInitialPoll(reviewData(initialAppData)),
	previewAccounts,
);
export const previewDataAtom = atom<AppData>(initialPreviewData);
export const previewAccountIdAtom = atom("alex");
const previewProgramCommandsAtom = atom<Record<string, string>>({});
export const selectedPersonAtom = atom("");
export const previewAccountsAtom = atom((get): Account[] =>
	previewAccounts.map((account) =>
		canonicalMemberAccount(
			{ ...account, ...get(previewHouseholdAccounts)[account.id] },
			get(previewDataAtom).members,
		),
	),
);
export const previewAccountAtom = atom((get): Account => {
	const account =
		get(previewAccountsAtom).find(
			(entry) => entry.id === get(previewAccountIdAtom),
		) ?? primaryAccount;
	return account;
});
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
		if (
			action.type === "delete-program" &&
			get(previewResources).some((resource) =>
				resource.programIds?.includes(action.id),
			)
		)
			throw new Error("This program has shared resources. Archive it instead.");
		if (action.type === "save-program") {
			const account = get(previewAccountAtom);
			if (!account.admin) throw new Error("Only admins can change programs.");
			const payload = programCommandPayload(action);
			const receiptKey = action.requestId
				? `${account.id}:${action.requestId}`
				: undefined;
			if (action.requestId) validateProgramRequestId(action.requestId);
			const previous = receiptKey
				? get(previewProgramCommandsAtom)[receiptKey]
				: undefined;
			if (previous) {
				if (previous !== payload)
					throw new Error(
						"This request ID was already used for another program change.",
					);
				return;
			}
			const next = reduceApp(get(previewDataAtom), account, action);
			const now = Date.now();
			const today = clubDate(now, next.timeZone);
			const series = get(previewSessionSeries).map((entry) =>
				reconcileSeriesEligibility(
					entry,
					next.events,
					next.members,
					today,
					now,
				),
			);
			set(previewSessionSeries, series);
			set(previewDataAtom, {
				...next,
				responses: series.reduce(
					(responses, entry) =>
						syncSeriesResponses(
							entry,
							next.events,
							responses,
							today,
							now,
							[],
							next.members,
						),
					next.responses,
				),
			});
			if (receiptKey)
				set(previewProgramCommandsAtom, {
					...get(previewProgramCommandsAtom),
					[receiptKey]: payload,
				});
			return;
		}
		if (action.type === "set-member-archived") {
			const current = get(previewDataAtom);
			const next = reduceApp(current, get(previewAccountAtom), action);
			if (action.archived)
				set(previewSessionSeries, (series) =>
					series.map((entry) =>
						endMemberEnrollments(
							entry,
							action.personId,
							clubDate(undefined, current.timeZone),
						),
					),
				);
			set(previewDataAtom, next);
			return;
		}
		if (action.type === "edit-event") {
			const previous = withManagedRooms(
				get(previewDataAtom),
				get(previewAccountsAtom),
			);
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
							next.members
								.filter((member) => member.archived)
								.map((member) => member.id),
							next.members,
						),
					next.responses,
				),
			});
			return;
		}
		set(
			previewDataAtom,
			reduceApp(
				withManagedRooms(get(previewDataAtom), get(previewAccountsAtom)),
				get(previewAccountAtom),
				action,
			),
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
	workspaceId?: string;
	loading?: boolean;
	dispatch: (action: AppAction) => Promise<boolean>;
};
export type AppStatus = {
	busy: boolean;
	error?: string;
	clearError: () => void;
};
export const AppStatusContext = createContext<AppStatus | undefined>(undefined);
export const useAppStatus = (): AppStatus => {
	const status = useContext(AppStatusContext);
	if (!status) throw new Error("AppProvider is required.");
	return status;
};
export const AppContext = createContext<AppContextValue | undefined>(undefined);
export const PreviewProvider = ({
	children,
	reviewAccount,
	reviewPerson,
	reviewScenario,
}: {
	children: ReactNode;
	reviewAccount?: string;
	reviewPerson?: string;
	reviewScenario?: string;
}): ReactElement => {
	const initialAccount =
		previewAccounts.find(
			(account) => account.id === previewAccountId(reviewAccount),
		) ?? primaryAccount;
	const requestedPerson = previewPersonId(reviewPerson);
	const initialPerson =
		requestedPerson &&
		[initialAccount.personId, ...initialAccount.children].includes(
			requestedPerson,
		)
			? requestedPerson
			: initialAccount.personId;
	const initialData = useMemo(
		() => reviewScenarioData(initialPreviewData, reviewScenario),
		[reviewScenario],
	);
	useHydrateAtoms([
		[previewDataAtom, initialData],
		[previewAccountIdAtom, initialAccount.id],
		[selectedPersonAtom, initialPerson],
	]);
	const rawData = useAtomValue(previewDataAtom);
	const committedSeries = useAtomValue(previewSessionSeries);
	const setPreviewData = useSetAtom(previewDataAtom);
	useEffect(() => {
		const sync = (): void =>
			setPreviewData((current) => {
				const responses = committedSeries.reduce(
					(responses, series) =>
						syncSeriesResponses(
							series,
							current.events,
							responses,
							clubDate(undefined, current.timeZone),
							Date.now(),
							current.members
								.filter((member) => member.archived)
								.map((member) => member.id),
							current.members,
						),
					current.responses,
				);
				return JSON.stringify(responses) === JSON.stringify(current.responses)
					? current
					: { ...current, responses };
			});
		sync();
		const lifecycle: { active: boolean; stop?: () => void } = { active: true };
		void import("../platform/minute-clock").then(
			({ subscribeMinute }): void => {
				if (lifecycle.active) lifecycle.stop = subscribeMinute(sync);
			},
		);
		return (): void => {
			lifecycle.active = false;
			lifecycle.stop?.();
		};
	}, [committedSeries, setPreviewData]);
	const resolvedAccounts = useAtomValue(previewAccountsAtom);
	const allData = useMemo((): AppData => {
		const storedData = withManagedRooms(rawData, resolvedAccounts);
		return {
			...storedData,
			conversations: storedData.conversations.map((thread) => {
				if (!thread.eventId) return thread;
				const event = storedData.events.find(
					(entry) => entry.id === thread.eventId,
				);
				return {
					...thread,
					accountIds: event
						? resolvedAccounts
								.filter((entry) =>
									canDiscussSession(entry, event, storedData.members),
								)
								.map((entry) => entry.id)
						: [],
				};
			}),
		};
	}, [rawData, resolvedAccounts]);
	const account = useAtomValue(previewAccountAtom);
	const act = useSetAtom(previewActionAtom);
	const [error, setError] = useState<string>();
	const clearError = useCallback((): void => setError(undefined), []);
	const dispatch = useCallback(
		async (action: AppAction): Promise<boolean> => {
			try {
				act(action);
				return true;
			} catch (error) {
				setError(error instanceof Error ? error.message : "Could not save.");
				return false;
			}
		},
		[act],
	);
	const value = useMemo<AppContextValue>(
		() => ({
			data: visibleAppData(allData, account),
			account,
			accounts: resolvedAccounts,
			source: "preview",
			workspaceId: "preview",
			dispatch,
		}),
		[allData, account, resolvedAccounts, dispatch],
	);
	const status = useMemo<AppStatus>(
		() => ({ busy: false, error, clearError }),
		[error, clearError],
	);
	return (
		<AppContext.Provider value={value}>
			<AppStatusContext value={status}>{children}</AppStatusContext>
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
		: householdDefault(account, data.members);
	const member = data.members.find((entry) => entry.id === personId);
	if (!member) throw new Error("Your profile is unavailable.");
	return member;
};
