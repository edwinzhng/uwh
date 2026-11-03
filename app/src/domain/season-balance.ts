import type { SeasonRecord } from "./season-ledger";

type SeasonBalance = {
	label: "Balance" | "Account credit";
	amount: number;
	status: "Payment due" | "Account credit" | "No dues" | "Paid in full";
	tone: "warning" | "success";
};

export const seasonBalance = (
	record: Pick<SeasonRecord, "due" | "paid">,
): SeasonBalance => ({
	label: record.paid > record.due ? "Account credit" : "Balance",
	amount: Math.abs(record.due - record.paid),
	status:
		record.due > record.paid
			? "Payment due"
			: record.paid > record.due
				? "Account credit"
				: record.due === 0
					? "No dues"
					: "Paid in full",
	tone: record.due > record.paid ? "warning" : "success",
});
