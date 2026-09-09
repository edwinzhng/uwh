import type { Member } from "./app-types";

export type SeasonRecord = {
	personId: string;
	seasonId: string;
	registration: Member["registration"];
	cuga: boolean;
	due: number;
	paid: number;
	revision: number;
};
export type LedgerChange = {
	kind: "payment" | "refund" | "dues";
	amount: number;
	note: string;
	date: string;
};
export const applyLedgerChange = (
	record: SeasonRecord,
	change: LedgerChange,
): SeasonRecord => {
	if (
		!Number.isSafeInteger(change.amount) ||
		change.amount < 0 ||
		change.amount > 100_000_000
	)
		throw new Error("Enter an amount between $0 and $1,000,000.");
	if (!change.note.trim() || change.note.length > 300)
		throw new Error("Add a short note.");
	if (change.kind !== "dues" && change.amount === 0)
		throw new Error("Enter an amount greater than zero.");
	if (change.kind === "payment" && change.amount > record.due - record.paid)
		throw new Error("Payment exceeds the remaining balance.");
	if (change.kind === "refund" && change.amount > record.paid)
		throw new Error("Refund exceeds payments received.");
	return {
		...record,
		due: change.kind === "dues" ? change.amount : record.due,
		paid:
			record.paid +
			(change.kind === "payment"
				? change.amount
				: change.kind === "refund"
					? -change.amount
					: 0),
		revision: record.revision + 1,
	};
};
