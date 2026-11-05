import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { useApp } from "../demo/app-state";
import {
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { AccountAccessEditor } from "./account-access-editor";

export const AccessPanel = (): ReactElement => {
	const { accounts, source } = useApp();
	const backend = useBackend();
	const [editing, setEditing] = useState<string>();
	const editingAccount = accounts.find((entry) => entry.id === editing);
	return (
		<Stack gap="heading">
			<SectionHeading>Account access</SectionHeading>
			<Surface>
				<Stack>
					{backend.clubCode ? (
						<Stack gap="xs">
							<Text variant="caption">Invite code</Text>
							<Text variant="small">{backend.clubCode}</Text>
						</Stack>
					) : undefined}
					<List>
						{accounts.map((entry) => (
							<ListItem
								key={entry.id}
								onPress={
									source === "convex"
										? (): void => setEditing(entry.id)
										: undefined
								}
								title={entry.name}
								description={
									(entry.admin ? "Admin · " : "") +
									(entry.coachPrograms.length ? "Coach · " : "") +
									(entry.children.length ? "Parent" : "Member")
								}
							/>
						))}
					</List>
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
				</Stack>
			</Surface>
		</Stack>
	);
};
