import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Combobox,
	DatePicker,
	Dialog,
	Field,
	ListItem,
	Row,
	SegmentedControl,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { clubDate } from "../domain/event-time";
import { ClubShell } from "./club-shell";
import { EquipmentReturns } from "./equipment-returns";
import { LocalPage } from "./local-page";

export const EquipmentScreen = (): ReactElement => {
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const [tab, setTab] = useState("inventory");
	const [search, setSearch] = useState("");
	const [issue, setIssue] = useState<string>();
	const [person, setPerson] = useState<string>();
	const [due, setDue] = useState<string | undefined>(() =>
		clubDate(Date.now() + 30 * 86400000),
	);
	const [add, setAdd] = useState(false);
	const [name, setName] = useState("");
	const [size, setSize] = useState("");
	const [condition, setCondition] = useState<"ready" | "repair">("ready");
	const people = new Map(
		data.members.map((person) => [person.id, person.name]),
	);
	const equipmentById = new Map(data.equipment.map((item) => [item.id, item]));
	const activeByItem = new Map(
		data.loans
			.filter((loan) => !loan.returned)
			.map((loan) => [loan.itemId, loan]),
	);
	const inventory = data.equipment.filter((item) =>
		(item.name + item.size).toLowerCase().includes(search.toLowerCase()),
	);
	const loans = [...activeByItem.values()].filter((loan) =>
		(
			(people.get(loan.personId) ?? "") +
			(equipmentById.get(loan.itemId)?.name ?? "")
		)
			.toLowerCase()
			.includes(search.toLowerCase()),
	);
	const saveItem = async (): Promise<void> => {
		if (
			await dispatch({
				type: "add-equipment",
				equipment: { id: newId(), name: name.trim(), size, condition },
			})
		) {
			setAdd(false);
			setName("");
			setSize("");
		}
	};
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
			staffRole={account.admin ? "admin" : undefined}
			title="Equipment"
			back={
				<Row>
					<Button
						label="Admin"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/administration")}
					/>
				</Row>
			}
			action={
				account.admin ? (
					<Button
						label="Item"
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
					<SegmentedControl
						label="Equipment"
						value={tab}
						onValueChange={setTab}
						options={[
							{ value: "inventory", label: "Inventory" },
							{ value: "loans", label: "Loans" },
							{ value: "history", label: "Returns" },
						]}
					/>

					<Field
						label="Search"
						value={search}
						onValueChange={setSearch}
						placeholder="Find equipment or a borrower"
					/>
					<Surface padding="xs">
						{tab === "history" ? (
							<EquipmentReturns search={search} />
						) : tab === "inventory" ? (
							<LocalPage key={search + tab} items={inventory}>
								{(items) => (
									<Stack gap="xs">
										{items.map((item) => {
											const loan = activeByItem.get(item.id);
											return (
												<ListItem
													key={item.id}
													title={item.name}
													icon="archive"
													description={
														item.size +
														(loan
															? ` · ${people.get(loan.personId) ?? "Member"}`
															: "")
													}
													trailing={
														loan ? (
															<Badge label="On loan" />
														) : item.condition === "repair" ? (
															<Badge label="Repair" kind="warning" />
														) : (
															<Button
																label="Issue"
																variant="ghost"
																onPress={(): void => setIssue(item.id)}
															/>
														)
													}
												/>
											);
										})}
										{!items.length ? (
											<ListItem title="No equipment found" />
										) : undefined}
									</Stack>
								)}
							</LocalPage>
						) : (
							<LocalPage key={search + tab} items={loans}>
								{(items) => (
									<Stack gap="xs">
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
												trailing={
													<Button
														label="Return"
														variant="secondary"
														isDisabled={busy}
														onPress={(): void => {
															void dispatch({
																type: "return",
																loanId: loan.id,
															});
														}}
													/>
												}
											/>
										))}
										{!items.length ? (
											<ListItem title="No loans found" />
										) : undefined}
									</Stack>
								)}
							</LocalPage>
						)}
					</Surface>
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
			<Dialog
				staffRole="admin"
				title="New equipment"
				isOpen={add}
				onOpenChange={setAdd}
				footer={
					<Button
						label="Add item"
						isLoading={busy}
						isDisabled={!name.trim()}
						onPress={(): void => {
							void saveItem();
						}}
					/>
				}
			>
				<Stack>
					<Field
						label="Item"
						value={name}
						onValueChange={setName}
						placeholder="Training fins"
					/>
					<Field
						label="Size / identifier"
						value={size}
						onValueChange={setSize}
						placeholder="38–40 · 022"
					/>
					<Select
						label="Condition"
						value={condition}
						options={[
							{ value: "ready", label: "Ready to use" },
							{ value: "repair", label: "Needs repair" },
						]}
						onValueChange={(value): void => {
							if (value) setCondition(value);
						}}
					/>
				</Stack>
			</Dialog>
		</ClubShell>
	);
};
