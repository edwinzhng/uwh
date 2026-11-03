import { formatDate, validDate } from "./app-rules";
import type {
	Account,
	ClubEvent,
	Equipment,
	Loan,
	Member,
	MemberLoan,
} from "./app-types";
import { equipmentStock } from "./equipment";
import { clubTimestamp } from "./event-time";
import { practiceEvent } from "./event-types";

export const equipmentLoanLimits = {
	guestsPerPractice: 200,
	page: 40,
} as const;
export type PracticeBorrower = { id: string; eventId: string; name: string };
export type EquipmentLoanRequest = {
	requestId: string;
	id: string;
	itemId: string;
	due: string;
	borrower:
		| { kind: "member"; personId: string }
		| { kind: "guest"; guestId: string; eventId: string; name: string };
};
export const loanBorrowerName = (
	loan: Loan,
	members: readonly Pick<Member, "id" | "name">[],
): string =>
	loan.borrower?.kind === "guest"
		? `${loan.borrower.name} (guest)`
		: (members.find((member) => member.id === loan.personId)?.name ??
			"Former member");
export const loanBorrowerDescription = (
	loan: Loan,
	members: readonly Pick<Member, "id" | "name">[],
): string =>
	loan.borrower
		? `${loanBorrowerName(loan, members)} · ${loan.borrower.practiceTitle} · ${formatDate(loan.borrower.practiceDate)}`
		: loanBorrowerName(loan, members);

export const availableLoanPractice = (
	event: ClubEvent,
	now: number,
	timeZone?: string,
): boolean =>
	practiceEvent(event) &&
	!event.cancelled &&
	clubTimestamp(
		event.endDate ?? event.date,
		event.end,
		event.timeZone ?? timeZone,
	) > now;

export const equipmentLoanError = (
	input: EquipmentLoanRequest,
): string | undefined => {
	if (!input.itemId) return "Choose equipment";
	if (!validDate(input.due)) return "Choose a return date";
	if (input.borrower.kind === "member")
		return input.borrower.personId ? undefined : "Choose a member";
	if (!input.borrower.eventId) return "Choose a practice";
	if (!input.borrower.name.trim()) return "Add the guest’s name";
	if (
		input.borrower.name.trim().length > 80 ||
		/[\r\n]/u.test(input.borrower.name)
	)
		return "Use a name of 80 characters or fewer";
	return undefined;
};
export const equipmentLoanPayload = (input: EquipmentLoanRequest): string =>
	JSON.stringify({
		id: input.id,
		itemId: input.itemId,
		due: input.due,
		borrower:
			input.borrower.kind === "guest"
				? {
						kind: input.borrower.kind,
						guestId: input.borrower.guestId,
						eventId: input.borrower.eventId,
						name: input.borrower.name.trim(),
					}
				: { kind: input.borrower.kind, personId: input.borrower.personId },
	});
export const validateEquipmentLoanKey = (input: EquipmentLoanRequest): void => {
	if (
		input.requestId.length < 16 ||
		input.requestId.length > 100 ||
		[
			input.id,
			input.itemId,
			input.borrower.kind === "guest"
				? input.borrower.guestId
				: input.borrower.personId,
		].some((id) => !id || id.length > 160) ||
		(input.borrower.kind === "guest" && input.borrower.eventId.length > 160)
	)
		throw new Error("Reopen Loan and try again");
};
export const memberLoan = (input: {
	loan: MemberLoan;
	item?: Equipment;
	loans: readonly Loan[];
	members: readonly Member[];
}): MemberLoan => {
	const previous = input.loans.find((entry) => entry.id === input.loan.id);
	if (previous) {
		if (
			previous.personId !== input.loan.personId ||
			previous.itemId !== input.loan.itemId ||
			previous.due !== input.loan.due
		)
			throw new Error("This loan ID is already in use");
		if (previous.borrower) throw new Error("This loan belongs to a guest");
		return previous;
	}
	if (!input.item || equipmentStock(input.item, input.loans).available === 0)
		throw new Error("This item is unavailable");
	if (
		!input.members.some(
			(person) =>
				person.id === input.loan.personId &&
				!person.archived &&
				!person.mergedInto,
		) ||
		!validDate(input.loan.due)
	)
		throw new Error("Choose a member and return date");
	return { ...input.loan, returned: false };
};
export const planEquipmentLoan = (input: {
	request: EquipmentLoanRequest;
	account: Pick<Account, "admin">;
	item?: Equipment;
	loans: readonly Loan[];
	members: readonly Member[];
	practice?: ClubEvent;
	guests: readonly PracticeBorrower[];
	now: number;
	timeZone?: string;
}): { loan: Loan; guest?: PracticeBorrower } => {
	if (!input.account.admin) throw new Error("Only admins can loan equipment");
	validateEquipmentLoanKey(input.request);
	const error = equipmentLoanError(input.request);
	if (error) throw new Error(error);
	if (input.loans.some((loan) => loan.id === input.request.id))
		throw new Error("This loan ID is already in use");
	const base = {
		id: input.request.id,
		itemId: input.request.itemId,
		due: input.request.due,
		returned: false,
	};
	if (input.request.borrower.kind === "member")
		return {
			loan: memberLoan({
				loan: { ...base, personId: input.request.borrower.personId },
				item: input.item,
				loans: input.loans,
				members: input.members,
			}),
		};
	if (!input.item || equipmentStock(input.item, input.loans).available === 0)
		throw new Error("This item is unavailable");
	const borrower = input.request.borrower;
	if (
		!input.practice ||
		input.practice.id !== borrower.eventId ||
		!availableLoanPractice(input.practice, input.now, input.timeZone)
	)
		throw new Error("Choose an upcoming or ongoing practice");
	if (input.request.due < input.practice.date)
		throw new Error("Return date must follow the practice date");
	const previous = input.guests.find((guest) => guest.id === borrower.guestId);
	const guest = {
		id: borrower.guestId,
		eventId: borrower.eventId,
		name: borrower.name.trim(),
	};
	if (
		previous &&
		(previous.eventId !== guest.eventId || previous.name !== guest.name)
	)
		throw new Error("Choose the guest again");
	if (
		!previous &&
		input.guests.filter((entry) => entry.eventId === borrower.eventId).length >=
			equipmentLoanLimits.guestsPerPractice
	)
		throw new Error("This practice has reached its guest-loan limit");
	return {
		loan: {
			...base,
			borrower: {
				kind: "guest",
				guestId: guest.id,
				eventId: guest.eventId,
				name: guest.name,
				practiceTitle: input.practice.title,
				practiceDate: input.practice.date,
			},
		},
		guest: previous ? undefined : guest,
	};
};
