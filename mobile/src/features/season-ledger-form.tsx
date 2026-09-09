import type { FunctionArgs } from "convex/server";
import { type ReactElement, useState } from "react";
import type { api } from "../../convex/_generated/api";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Stack,
	Text,
} from "../design-system";
import { clubDate } from "../domain/event-time";
import type { LedgerChange, SeasonRecord } from "../domain/season-ledger";

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
	const [date, setDate] = useState(clubDate);
	const submit = async (): Promise<void> => {
		if (
			await save(
				{ kind, amount: Math.round(Number(amount) * 100), note, date },
				revision,
			)
		)
			onClose();
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
				<Button
					label="Save"
					isLoading={busy}
					isDisabled={!amount || !note.trim()}
					onPress={(): void => {
						void submit();
					}}
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
