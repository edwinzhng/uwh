import { type ReactElement, useRef, useState } from "react";
import type { EquipmentLoanService } from "../backend/use-equipment-loans";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	DatePicker,
	Dialog,
	Field,
	InfiniteScroll,
	LoadingContent,
	Select,
	Stack,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import {
	type EquipmentLoanRequest,
	equipmentLoanError,
	equipmentLoanPayload,
} from "../domain/equipment-loans";
import { clubDate } from "../domain/event-time";
import type { EquipmentLoanProviderProps } from "./equipment-loan-live";
import { useFormTask } from "./use-form-task";

export const EquipmentLoanForm = ({
	item,
	practice,
	eventId,
	onEventChange,
	onClose,
	service,
}: EquipmentLoanProviderProps & {
	service: EquipmentLoanService;
}): ReactElement => {
	const { data, account } = useApp();
	const task = useFormTask();
	const [itemId, setItemId] = useState(item?.id);
	const [kind, setKind] = useState<"member" | "guest">(
		practice ? "guest" : "member",
	);
	const [personId, setPersonId] = useState<string>();
	const [guestId, setGuestId] = useState<string>("new");
	const [guestName, setGuestName] = useState("");
	const [newGuestId] = useState(newId);
	const [loanId] = useState(newId);
	const [due, setDue] = useState<string | undefined>(() =>
		clubDate(Date.now() + 30 * 86400000, data.timeZone),
	);
	const requestKey = useRef<{ payload: string; key: string } | undefined>(
		undefined,
	);
	const items =
		item && !service.items.some((entry) => entry.id === item.id)
			? [item, ...service.items]
			: service.items;
	const practices =
		practice && !service.practices.some((entry) => entry.id === practice.id)
			? [practice, ...service.practices]
			: service.practices;
	const selectedGuest = service.guests.find((guest) => guest.id === guestId);
	const request: EquipmentLoanRequest = {
		requestId: "pending-equipment-loan",
		id: loanId,
		itemId: itemId ?? "",
		due: due ?? "",
		borrower:
			kind === "member"
				? { kind, personId: personId ?? "" }
				: {
						kind,
						guestId: guestId === "new" ? newGuestId : guestId,
						eventId: eventId ?? "",
						name: guestId === "new" ? guestName : (selectedGuest?.name ?? ""),
					},
	};
	const save = async (): Promise<void> => {
		const saved = await task.submit(
			() => equipmentLoanError(request),
			async (): Promise<void> => {
				const payload = equipmentLoanPayload(request);
				const previous = requestKey.current;
				const key = previous?.payload === payload ? previous.key : newId();
				requestKey.current = { payload, key };
				await service.save({ ...request, requestId: key });
			},
		);
		if (saved) onClose();
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={item ? `Loan ${item.name}` : "Loan equipment"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Loan"
					isLoading={task.busy}
					isDisabled={
						!account.admin ||
						service.loading ||
						(kind === "guest" && service.guestsLoading)
					}
					validationError={equipmentLoanError(request)}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			{!account.admin ? (
				<Text>You no longer have access to loan equipment.</Text>
			) : service.loading ? (
				<LoadingContent />
			) : (
				<Stack>
					{!item ? (
						<Combobox
							listFooter={
								<InfiniteScroll
									loadMore={service.moreItems}
									loading={undefined}
									revision={service.items.length}
									disabled={task.busy}
								/>
							}
							label="Equipment"
							value={itemId}
							onValueChange={setItemId}
							isDisabled={task.busy}
							options={items.map((entry) => ({
								value: entry.id,
								label: `${entry.name}${entry.size ? ` · ${entry.size}` : ""}`,
								isDisabled: entry.condition === "repair",
							}))}
						/>
					) : undefined}

					<Select
						label="Borrower"
						value={kind}
						onValueChange={(value): void => {
							if (value) setKind(value);
						}}
						isDisabled={task.busy}
						options={[
							{ value: "member", label: "Member" },
							{ value: "guest", label: "Guest" },
						]}
					/>
					{kind === "member" ? (
						<Combobox
							label="Member"
							value={personId}
							onValueChange={setPersonId}
							isDisabled={task.busy}
							options={data.members
								.filter((member) => !member.archived && !member.mergedInto)
								.map((member) => ({ value: member.id, label: member.name }))}
						/>
					) : (
						<>
							{practice ? (
								<Text variant="small">
									{practice.title} · {formatDate(practice.date)}
								</Text>
							) : (
								<Combobox
									listFooter={
										<InfiniteScroll
											loadMore={service.morePractices}
											loading={undefined}
											revision={service.practices.length}
											disabled={task.busy}
										/>
									}
									label="Practice"
									value={eventId}
									onValueChange={(value): void => {
										onEventChange(value);
										setGuestId("new");
									}}
									isDisabled={task.busy}
									options={practices.map((event) => ({
										value: event.id,
										label: `${event.title} · ${formatDate(event.date)}`,
									}))}
								/>
							)}

							{service.guests.length ? (
								<Select
									label="Guest"
									value={guestId}
									onValueChange={(value): void => setGuestId(value ?? "new")}
									isDisabled={task.busy || service.guestsLoading}
									options={[
										{ value: "new", label: "New guest" },
										...service.guests.map((guest) => ({
											value: guest.id,
											label: guest.name,
										})),
									]}
								/>
							) : undefined}
							{guestId === "new" ? (
								<Field
									label="Guest name"
									value={guestName}
									onValueChange={setGuestName}
									isDisabled={task.busy}
								/>
							) : undefined}
						</>
					)}
					<DatePicker
						label="Return by"
						value={due}
						onValueChange={setDue}
						isDisabled={task.busy}
					/>
					{task.error ? (
						<Text tone="danger" variant="small">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			)}
		</Dialog>
	);
};
