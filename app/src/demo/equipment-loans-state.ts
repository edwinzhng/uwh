import { atom } from "jotai";
import {
	type EquipmentLoanRequest,
	equipmentLoanPayload,
	type PracticeBorrower,
	planEquipmentLoan,
	validateEquipmentLoanKey,
} from "../domain/equipment-loans";
import { previewAccountAtom, previewDataAtom } from "./app-state";

export const previewEquipmentGuests = atom<PracticeBorrower[]>([]);
export const previewEquipmentLoanCommands = atom<
	Record<string, { payload: string; loanId: string }>
>({});
export const previewCreateEquipmentLoan = atom(
	undefined,
	(
		get,
		set,
		input: { actorId: string; request: EquipmentLoanRequest },
	): void => {
		const account = get(previewAccountAtom);
		if (!account.admin || account.id !== input.actorId)
			throw new Error("Only admins can loan equipment");
		validateEquipmentLoanKey(input.request);
		const key = `${account.id}:${input.request.requestId}`;
		const payload = equipmentLoanPayload(input.request);
		const previous = get(previewEquipmentLoanCommands)[key];
		const data = get(previewDataAtom);
		if (previous) {
			if (previous.payload !== payload)
				throw new Error("This request is already in use");
			if (!data.loans.some((loan) => loan.id === previous.loanId))
				throw new Error("This loan is no longer available");
			return;
		}
		const guests = get(previewEquipmentGuests);
		const borrower = input.request.borrower;
		const plan = planEquipmentLoan({
			request: input.request,
			account,
			item: data.equipment.find((item) => item.id === input.request.itemId),
			loans: data.loans,
			members: data.members,
			practice:
				borrower.kind === "guest"
					? data.events.find((event) => event.id === borrower.eventId)
					: undefined,
			guests,
			now: Date.now(),
			timeZone: data.timeZone,
		});
		set(previewDataAtom, { ...data, loans: [...data.loans, plan.loan] });
		if (plan.guest) set(previewEquipmentGuests, [...guests, plan.guest]);
		set(previewEquipmentLoanCommands, {
			...get(previewEquipmentLoanCommands),
			[key]: { payload, loanId: plan.loan.id },
		});
	},
);
