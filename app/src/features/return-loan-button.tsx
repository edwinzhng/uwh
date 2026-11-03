import type { ReactElement } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import type { Loan } from "../domain/app-types";
import { loanBorrowerName } from "../domain/equipment-loans";
import { ConfirmButton } from "./confirm-button";

export const ReturnLoanButton = ({ loan }: { loan: Loan }): ReactElement => {
	const { data, dispatch } = useApp();
	const { busy } = useAppStatus();
	const item = data.equipment.find((entry) => entry.id === loan.itemId);
	return (
		<ConfirmButton
			label="Return"
			variant="secondary"
			title="Mark as returned?"
			description={`Confirm ${loanBorrowerName(loan, data.members)} returned ${item?.name ?? "this item"}${item?.size ? ` (${item.size})` : ""}. This closes the loan and can’t be undone.`}
			confirmLabel="Mark returned"
			isDisabled={busy || loan.returned}
			onConfirm={(): Promise<boolean> =>
				dispatch({ type: "return", loanId: loan.id })
			}
		/>
	);
};
