import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	Button,
	EmptyState,
	Field,
	List,
	ListItem,
	Row,
	Stack,
	Surface,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { Equipment } from "../domain/app-types";
import { loanBorrowerDescription } from "../domain/equipment-loans";
import { ClubShell } from "./club-shell";
import { EquipmentEditor } from "./equipment-editor";
import { EquipmentInventory } from "./equipment-inventory";
import { EquipmentLoanDialog } from "./equipment-loan-dialog";
import { EquipmentReturns } from "./equipment-returns";
import { LocalPage } from "./local-page";
import { ReturnLoanButton } from "./return-loan-button";

export const EquipmentScreen = (): ReactElement => {
	const { data, account } = useApp();
	const { busy } = useAppStatus();
	const router = useRouter();
	const [tab, setTab] = useState("items");
	const [search, setSearch] = useState("");
	const [loanItem, setLoanItem] = useState<Equipment>();
	const [add, setAdd] = useState(false);
	const [editing, setEditing] = useState<Equipment>();
	const equipmentById = new Map(data.equipment.map((item) => [item.id, item]));
	const inventory = data.equipment.filter((item) =>
		(item.name + item.size).toLowerCase().includes(search.toLowerCase()),
	);
	const loans = data.loans
		.filter((loan) => !loan.returned)
		.filter((loan) =>
			(
				loanBorrowerDescription(loan, data.members) +
				(equipmentById.get(loan.itemId)?.name ?? "")
			)
				.toLowerCase()
				.includes(search.toLowerCase()),
		);
	return (
		<ClubShell
			tabs={
				<Tabs
					page
					hideLabel
					label="Equipment"
					value={tab}
					onValueChange={setTab}
					options={[
						{ value: "items", label: "Items" },
						{ value: "loans", label: "Loans" },
						{ value: "history", label: "Returns" },
					]}
				/>
			}
			title="Equipment"
			back={
				<Row>
					<Button
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
			action={
				account.admin ? (
					<Button
						label="New item"
						prefix="plus"
						onPress={(): void => setAdd(true)}
					/>
				) : undefined
			}
		>
			{!account.admin ? (
				<Text>You don’t have access to equipment management.</Text>
			) : (
				<Stack>
					<Field
						label="Search"
						value={search}
						onValueChange={setSearch}
						placeholder="Find equipment or a borrower"
					/>
					<TabContent value={tab}>
						<Surface>
							{tab === "history" ? (
								<EquipmentReturns search={search} />
							) : tab === "items" ? (
								<EquipmentInventory
									key={search}
									items={inventory}
									loans={data.loans}
									busy={busy}
									onEdit={setEditing}
									onLoan={(id): void =>
										setLoanItem(data.equipment.find((item) => item.id === id))
									}
								/>
							) : (
								<LocalPage key={search + tab} items={loans}>
									{(items) => (
										<List>
											{items.map((loan) => (
												<ListItem
													key={loan.id}
													title={
														equipmentById.get(loan.itemId)?.name ?? "Equipment"
													}
													description={
														loanBorrowerDescription(loan, data.members) +
														" · Due " +
														formatDate(loan.due)
													}
													trailing={<ReturnLoanButton loan={loan} />}
												/>
											))}
											{!items.length ? (
												<EmptyState
													title="No loans found"
													description="Try another filter or loan equipment to a member or guest."
												/>
											) : undefined}
										</List>
									)}
								</LocalPage>
							)}
						</Surface>
					</TabContent>
				</Stack>
			)}
			{loanItem ? (
				<EquipmentLoanDialog
					item={loanItem}
					onClose={(): void => setLoanItem(undefined)}
				/>
			) : undefined}
			{add || editing ? (
				<EquipmentEditor
					item={editing}
					onClose={(): void => {
						setAdd(false);
						setEditing(undefined);
					}}
				/>
			) : undefined}
		</ClubShell>
	);
};
