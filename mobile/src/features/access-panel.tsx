import { type ReactElement, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Combobox,
	Dialog,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import { AccountAccessEditor } from "./account-access-editor";

export const AccessPanel = (): ReactElement => {
	const { data, accounts, source } = useApp();
	const backend = useBackend();
	const [editing, setEditing] = useState<string>();
	const editingAccount = accounts.find((entry) => entry.id === editing);
	const [requestId, setRequestId] = useState<Id<"joinRequests">>();
	const [personId, setPersonId] = useState<string>();
	const [children, setChildren] = useState<string[]>([]);
	const [coaching, setCoaching] = useState<string[]>([]);
	const [admin, setAdmin] = useState(false);
	const [verified, setVerified] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const request = backend.requests.find((entry) => entry.id === requestId);
	const approve = async (): Promise<void> => {
		if (!request || !personId) return;
		setBusy(true);
		setError(undefined);
		try {
			await backend.approve?.(request.id, personId, children, coaching, admin);
			setRequestId(undefined);
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Surface>
			<Stack>
				<Text variant="h4">Account access</Text>
				{backend.clubCode ? (
					<Stack gap="xs">
						<Text variant="caption" tone="secondary">
							Club code · share this to request access
						</Text>
						<Text variant="small">{backend.clubCode}</Text>
					</Stack>
				) : (
					<Text variant="small" tone="secondary">
						Sign in and create a club to manage access requests.
					</Text>
				)}
				{backend.requests.map((entry) => (
					<ListItem
						key={entry.id}
						title={entry.name}
						description="Requesting access"
						trailing={<Badge label="Pending" kind="warning" />}
						onPress={(): void => {
							setRequestId(entry.id);
							setPersonId(undefined);
							setChildren([]);
							setCoaching([]);
							setAdmin(false);
							setVerified(false);
						}}
					/>
				))}
				{accounts.map((entry) => (
					<ListItem
						key={entry.id}
						onPress={
							source === "convex" ? (): void => setEditing(entry.id) : undefined
						}
						title={entry.name}
						description={
							(entry.admin ? "Admin · " : "") +
							(entry.coachPrograms.length ? "Coach · " : "") +
							(entry.children.length ? "Parent" : "Member")
						}
					/>
				))}
				{editingAccount ? (
					<AccountAccessEditor
						key={editingAccount.id}
						account={editingAccount}
						onClose={(): void => setEditing(undefined)}
					/>
				) : undefined}
				{source === "preview" ? (
					<Text variant="caption" tone="secondary">
						Preview accounts are examples.
					</Text>
				) : undefined}
				<Dialog
					staffRole="admin"
					title={`Approve ${request?.name ?? "account"}`}
					isOpen={Boolean(request)}
					onOpenChange={(open): void => {
						if (!open) setRequestId(undefined);
					}}
					footer={
						<Row>
							<Button
								label="Decline"
								variant="secondary"
								isDisabled={busy}
								onPress={(): void => {
									if (!request) return;
									setBusy(true);
									setError(undefined);
									void backend
										.declineRequest?.(request.id)
										.then((): void => setRequestId(undefined))
										.catch((error): void => setError(friendlyError(error)))
										.finally((): void => setBusy(false));
								}}
							/>
							<Button
								label="Approve access"
								isLoading={busy}
								isDisabled={!personId || !verified}
								onPress={(): void => {
									void approve();
								}}
							/>
						</Row>
					}
				>
					<Stack>
						<Combobox
							label="Their profile"
							value={personId}
							onValueChange={(value): void => {
								setPersonId(value);
								setChildren((ids) => ids.filter((id) => id !== value));
							}}
							options={data.members
								.filter(
									(member) =>
										!accounts.some((entry) => entry.personId === member.id),
								)
								.map((member) => ({ value: member.id, label: member.name }))}
						/>
						<Text variant="label">Linked children</Text>
						{data.members
							.filter((member) => member.id !== personId)
							.map((member) => (
								<Toggle
									key={member.id}
									label={member.name}
									value={children.includes(member.id)}
									onValueChange={(value): void =>
										setChildren((ids) =>
											value
												? [...ids, member.id]
												: ids.filter((id) => id !== member.id),
										)
									}
								/>
							))}
						<Text variant="label">Coaching access</Text>
						<Toggle
							label="Coach"
							value={coaching.length > 0}
							onValueChange={(value): void =>
								setCoaching(value ? ["club", "youth"] : [])
							}
						/>
						<Toggle
							label="Club administrator"
							value={admin}
							onValueChange={setAdmin}
						/>
						<Toggle
							label="I’ve verified this person and their family links"
							value={verified}
							onValueChange={setVerified}
						/>
						{error ? (
							<Text variant="small" tone="danger">
								{error}
							</Text>
						) : undefined}
					</Stack>
				</Dialog>
			</Stack>
		</Surface>
	);
};
