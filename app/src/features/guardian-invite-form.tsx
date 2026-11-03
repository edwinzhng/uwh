import { type ReactElement, useState } from "react";
import type { HouseholdService } from "../backend/use-household";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Row, Select, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

export const GuardianInviteForm = ({
	member,
	service,
}: {
	member: Member;
	service: HouseholdService;
}): ReactElement | undefined => {
	const { account, accounts } = useApp();
	const reviewFlow = useReviewFlow();
	const [open, setOpen] = useState(reviewFlow === "guardian-invite");
	const [accountId, setAccountId] = useState<string | undefined>(() =>
		reviewFlow === "guardian-invite" ? "taylor" : undefined,
	);
	const task = useFormTask();
	const [invitation, setInvitation] = useState(0);
	const key = useOperationKey();
	if (!account.admin || member.archived || member.mergedInto) return undefined;
	const candidates = accounts.filter(
		(candidate) =>
			candidate.personId !== member.id &&
			!candidate.children.includes(member.id),
	);
	const submit = (): void => {
		void task.submit(
			() => (accountId ? undefined : "Choose the verified account to invite."),
			async (): Promise<void> => {
				if (!accountId) return;
				await service.command({
					type: "invite",
					accountId,
					personId: member.id,
					key: key(`${invitation}:${accountId}:${member.id}`),
				});
				setOpen(false);
				setInvitation((current) => current + 1);
				setAccountId(undefined);
			},
		);
	};
	return (
		<>
			<Button
				label="Invite guardian"
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title={`Guardian access · ${member.name}`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Row justify="end" wrap>
						<Button
							label="Cancel"
							variant="ghost"
							isDisabled={task.busy}
							onPress={(): void => setOpen(false)}
						/>
						<Button
							label="Send invitation"
							isLoading={task.busy}
							onPress={submit}
						/>
					</Row>
				}
			>
				<Stack>
					<Text variant="small" tone="secondary">
						Only invite an account you have verified may manage this member.
						Accepting grants access to private contact details, progress,
						attendance and household actions. No staff roles or login identities
						change.
					</Text>
					<Select
						label="Existing verified club account"
						value={accountId}
						options={candidates.map((candidate) => ({
							value: candidate.id,
							label: candidate.name,
							person: { id: candidate.personId, name: candidate.name },
						}))}
						onValueChange={setAccountId}
						isDisabled={task.busy}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
