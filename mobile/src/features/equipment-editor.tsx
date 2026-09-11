import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Select, Stack } from "../design-system";
import type { Equipment } from "../domain/app-types";
import { equipmentStock } from "../domain/equipment";

export const EquipmentEditor = ({
	item,
	onClose,
}: {
	item?: Equipment;
	onClose: () => void;
}): ReactElement => {
	const { data, dispatch, busy } = useApp();
	const [id] = useState(() => item?.id ?? newId());
	const [name, setName] = useState(item?.name ?? "");
	const [size, setSize] = useState(item?.size ?? "");
	const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
	const [condition, setCondition] = useState<Equipment["condition"]>(
		item?.condition ?? "ready",
	);
	const total = Number(quantity);
	const minimum = item
		? Math.max(1, equipmentStock(item, data.loans).onLoan)
		: 1;
	const error =
		!Number.isSafeInteger(total) || total < minimum || total > 10000
			? `Enter a whole number from ${minimum} to 10,000.`
			: undefined;
	const save = async (): Promise<void> => {
		if (
			await dispatch({
				type: item ? "update-equipment" : "add-equipment",
				equipment: {
					id,
					name: name.trim(),
					size: size.trim(),
					condition,
					quantity: total,
				},
			})
		)
			onClose();
	};
	return (
		<Dialog
			title={item ? "Edit item" : "New item"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
			footer={
				<Button
					label={item ? "Save" : "Add item"}
					isLoading={busy}
					validationError={
						!name.trim() || Boolean(error)
							? "Check the required fields"
							: undefined
					}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Field
					label="Name"
					value={name}
					onValueChange={setName}
					placeholder="Training fins"
				/>
				<Field
					label="Size / identifier"
					value={size}
					onValueChange={setSize}
					placeholder="38–40"
				/>
				<Field
					label="Quantity"
					value={quantity}
					onValueChange={setQuantity}
					inputMode="numeric"
					error={error}
				/>
				<Select
					label="Condition"
					value={condition}
					options={[
						{ value: "ready", label: "Ready" },
						{ value: "repair", label: "Needs repair" },
					]}
					onValueChange={(value): void => {
						if (value) setCondition(value);
					}}
				/>
			</Stack>
		</Dialog>
	);
};
