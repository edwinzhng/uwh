import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	previewCreateEquipmentLoan,
	previewEquipmentGuests,
} from "../demo/equipment-loans-state";
import type { ClubEvent, Equipment } from "../domain/app-types";
import {
	availableLoanPractice,
	type EquipmentLoanRequest,
	type PracticeBorrower,
} from "../domain/equipment-loans";

export type EquipmentLoanService = {
	items: Equipment[];
	practices: ClubEvent[];
	guests: PracticeBorrower[];
	loading: boolean;
	guestsLoading: boolean;
	moreItems?: () => void;
	morePractices?: () => void;
	save: (request: EquipmentLoanRequest) => Promise<void>;
};
export const useLiveEquipmentLoans = (
	eventId?: string,
): EquipmentLoanService => {
	const items = usePaginatedQuery(
		api.equipment_loans.catalog,
		{},
		{ initialNumItems: 20 },
	);
	const practices = usePaginatedQuery(
		api.equipment_loans.practices,
		{},
		{ initialNumItems: 20 },
	);
	const guests = useQuery(
		api.equipment_loans.guests,
		eventId ? { eventId } : "skip",
	);
	const save = useMutation(api.equipment_loans.create);
	return {
		items: items.results,
		practices: practices.results,
		guests: guests ?? [],
		loading:
			items.status === "LoadingFirstPage" ||
			practices.status === "LoadingFirstPage",
		guestsLoading: Boolean(eventId) && guests === undefined,
		moreItems:
			items.status === "CanLoadMore"
				? (): void => items.loadMore(20)
				: undefined,
		morePractices:
			practices.status === "CanLoadMore"
				? (): void => practices.loadMore(20)
				: undefined,
		save: async (request): Promise<void> => {
			await save({ request });
		},
	};
};
export const usePreviewEquipmentLoans = (
	eventId?: string,
): EquipmentLoanService => {
	const { data, account } = useApp();
	const guests = useAtomValue(previewEquipmentGuests);
	const create = useSetAtom(previewCreateEquipmentLoan);
	return {
		items: data.equipment,
		practices: data.events.filter((event) =>
			availableLoanPractice(event, Date.now(), data.timeZone),
		),
		guests: guests.filter((guest) => guest.eventId === eventId),
		loading: false,
		guestsLoading: false,
		save: async (request): Promise<void> =>
			create({ actorId: account.id, request }),
	};
};
