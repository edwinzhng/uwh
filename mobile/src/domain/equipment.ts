import type { Equipment, Loan } from "./app-types";

export const equipmentStock = (
	item: Equipment,
	loans: readonly Loan[],
): { total: number; onLoan: number; available: number } => {
	const total = item.quantity ?? 1;
	const onLoan = loans.filter(
		(loan) => loan.itemId === item.id && !loan.returned,
	).length;
	return {
		total,
		onLoan,
		available: item.condition === "ready" ? Math.max(0, total - onLoan) : 0,
	};
};

export const validateEquipment = (
	item: Equipment,
	loans: readonly Loan[],
): void => {
	if (!item.name.trim()) throw new Error("Add an item name.");
	const { total, onLoan } = equipmentStock(item, loans);
	if (!Number.isSafeInteger(total) || total < 1 || total > 10000)
		throw new Error("Quantity must be a whole number from 1 to 10,000.");
	if (total < onLoan)
		throw new Error(
			`Return borrowed items before reducing quantity below ${onLoan}.`,
		);
};
