import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import type { Loan } from "../domain/app-types";
import { ConfirmButton } from "./confirm-button";

export const ReturnLoanButton = ({ loan }: { loan: Loan }): ReactElement => {
	const { data, dispatch, busy } = useApp();
	const item = data.equipment.find((entry) => entry.id === loan.itemId);
	const person = data.members.find((entry) => entry.id === loan.personId);
	return (
		<ConfirmButton
			label="Return"
			variant="secondary"
			title="Mark as returned?"
			description={`Confirm ${person?.name ?? "the borrower"} returned ${item?.name ?? "this item"}${item?.size ? ` (${item.size})` : ""}. This closes the loan and can’t be undone.`}
			confirmLabel="Mark returned"
			isDisabled={busy || loan.returned}
			onConfirm={(): Promise<boolean> =>
				dispatch({ type: "return", loanId: loan.id })
			}
		/>
	);
};
