import type { FunctionArgs } from "convex/server";
import { type ReactElement, useState } from "react";
import type { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { DatePicker, Dialog, Field, Stack, Text } from "../design-system";
import { memberName, money } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import type { LedgerChange, SeasonRecord } from "../domain/season-ledger";
import { ConfirmButton } from "./confirm-button";

export const SeasonLedgerForm = ({
	kind,
	record,
	busy,
	error,
	save,
	onClose,
}: {
	kind: LedgerChange["kind"];
	record: SeasonRecord;
	busy: boolean;
	error?: string;
	save: (
		change: FunctionArgs<typeof api.season_records.change>["change"],
		revision?: number,
	) => Promise<boolean>;
	onClose: () => void;
}): ReactElement => {
	const { data } = useApp();
	const [revision] = useState(record.revision);
	const [amount, setAmount] = useState(
		String(
			(kind === "dues"
				? record.due
				: kind === "refund"
					? record.paid
					: Math.max(0, record.due - record.paid)) / 100,
		),
	);
	const [note, setNote] = useState(kind === "payment" ? "E-transfer" : "");
	const [date, setDate] = useState(() => clubDate(undefined, data.timeZone));
	const submit = async (): Promise<boolean> => {
		if (
			await save(
				{ kind, amount: Math.round(Number(amount) * 100), note, date },
				revision,
			)
		) {
			onClose();
			return true;
		}
		return false;
	};
	return (
		<Dialog
			title={
				kind === "dues"
					? "Set season dues"
					: kind === "refund"
						? "Record refund"
						: "Record payment"
			}
			staffRole="admin"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
			footer={
				<ConfirmButton
					label={
						kind === "dues"
							? "Set dues"
							: kind === "refund"
								? "Record refund"
								: "Record payment"
					}
					title={
						kind === "dues"
							? "Set season dues?"
							: kind === "refund"
								? "Record refund?"
								: "Record payment?"
					}
					description={`${memberName(data, record.personId)} · ${money(Math.round(Number(amount) * 100))} · ${date}. ${kind === "dues" ? "Updates the season balance." : "Adds a permanent ledger entry. No money is transferred."}`}
					confirmLabel={
						kind === "dues"
							? "Set dues"
							: kind === "refund"
								? "Record refund"
								: "Record payment"
					}
					isDisabled={
						busy ||
						!amount ||
						!Number.isFinite(Number(amount)) ||
						Number(amount) < 0 ||
						(kind !== "dues" && Number(amount) === 0) ||
						!note.trim()
					}
					onConfirm={submit}
				/>
			}
		>
			<Stack>
				{error ? (
					<Text tone="danger" variant="small">
						{error}
					</Text>
				) : undefined}
				<Field
					label={kind === "dues" ? "Total dues (CAD)" : "Amount (CAD)"}
					inputMode="decimal"
					value={amount}
					onValueChange={setAmount}
				/>
				<Field
					label="Note"
					value={note}
					onValueChange={setNote}
					placeholder="Reason or payment reference"
				/>
				<DatePicker
					label="Date"
					value={date}
					onValueChange={(value): void => {
						if (value) setDate(value);
					}}
				/>
			</Stack>
		</Dialog>
	);
};
