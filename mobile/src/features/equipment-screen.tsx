import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	DatePicker,
	Dialog,
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
import type { Equipment } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import { ClubShell } from "./club-shell";
import { EquipmentEditor } from "./equipment-editor";
import { EquipmentInventory } from "./equipment-inventory";
import { EquipmentReturns } from "./equipment-returns";
import { LocalPage } from "./local-page";
import { ReturnLoanButton } from "./return-loan-button";

export const EquipmentScreen = (): ReactElement => {
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const [tab, setTab] = useState("items");
	const [search, setSearch] = useState("");
	const [issue, setIssue] = useState<string>();
	const [person, setPerson] = useState<string>();
	const [due, setDue] = useState<string | undefined>(() =>
		clubDate(Date.now() + 30 * 86400000, data.timeZone),
	);
	const [add, setAdd] = useState(false);
	const [editing, setEditing] = useState<Equipment>();
	const people = new Map(
		data.members.map((person) => [person.id, person.name]),
	);
	const equipmentById = new Map(data.equipment.map((item) => [item.id, item]));
	const inventory = data.equipment.filter((item) =>
		(item.name + item.size).toLowerCase().includes(search.toLowerCase()),
	);
	const loans = data.loans
		.filter((loan) => !loan.returned)
		.filter((loan) =>
			(
				(people.get(loan.personId) ?? "") +
				(equipmentById.get(loan.itemId)?.name ?? "")
			)
				.toLowerCase()
				.includes(search.toLowerCase()),
		);
	const issueItem = async (): Promise<void> => {
		if (
			issue &&
			person &&
			due &&
			(await dispatch({
				type: "issue",
				loan: {
					id: newId(),
					itemId: issue,
					personId: person,
					due,
					returned: false,
				},
			}))
		) {
			setIssue(undefined);
			setPerson(undefined);
		}
	};
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
			staffRole={account.admin ? "admin" : undefined}
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
						<Surface padding="xs">
							{tab === "history" ? (
								<EquipmentReturns search={search} />
							) : tab === "items" ? (
								<EquipmentInventory
									key={search}
									items={inventory}
									loans={data.loans}
									busy={busy}
									onEdit={setEditing}
									onIssue={setIssue}
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
														(people.get(loan.personId) ?? "Member") +
														" · Due " +
														loan.due
													}
													trailing={<ReturnLoanButton loan={loan} />}
												/>
											))}
											{!items.length ? (
												<EmptyState
													title="No loans found"
													description="Try another filter or issue equipment to a member."
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
			<Dialog
				staffRole="admin"
				title={
					"Issue " +
					(data.equipment.find((item) => item.id === issue)?.name ??
						"equipment")
				}
				isOpen={Boolean(issue)}
				onOpenChange={(open): void => {
					if (!open) setIssue(undefined);
				}}
				footer={
					<Button
						label="Issue equipment"
						isDisabled={!person || !due}
						isLoading={busy}
						onPress={(): void => {
							void issueItem();
						}}
					/>
				}
			>
				<Stack>
					<Combobox
						label="Borrower"
						value={person}
						onValueChange={setPerson}
						options={data.members.map((member) => ({
							value: member.id,
							label: member.name,
						}))}
					/>
					<DatePicker label="Return by" value={due} onValueChange={setDue} />
				</Stack>
			</Dialog>
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
