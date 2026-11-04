import { type ReactElement, useState } from "react";
import type { HouseholdService } from "../backend/use-household";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	Field,
	IconButton,
	List,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { householdNameError } from "../domain/household";
import { HouseholdInfoAction } from "./household-info-action";
import { HouseholdInvitations } from "./household-invitations";
import { HouseholdProfileRow } from "./household-profile-row";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

export const HouseholdProfiles = ({
	service,
}: {
	service: HouseholdService;
}): ReactElement => {
	const reviewFlow = useReviewFlow();
	const { data } = useApp();
	const [editing, setEditing] = useState<Member>();
	const [adding, setAdding] = useState(reviewFlow === "household-create");
	const [name, setName] = useState("");
	const [creation, setCreation] = useState(0);
	const task = useFormTask();
	const key = useOperationKey();
	const state = service.state;
	const create = (): void => {
		void task.submit(
			() => householdNameError(name),
			async (): Promise<void> => {
				await service.command({
					type: "create",
					name,
					key: key(`${creation}:${name.trim()}`),
				});
				setAdding(false);
				setCreation((current) => current + 1);
				setName("");
			},
		);
	};
	return (
		<Stack>
			<Surface
				header={
					<Row justify="between">
						<Text variant="h4">Linked profiles</Text>
						<IconButton
							label="Add dependent"
							icon="plus"
							isDisabled={task.busy || !state}
							onPress={(): void => {
								task.clear();
								setAdding(true);
							}}
						/>
					</Row>
				}
			>
				<Stack>
					{state ? (
						<List>
							{state.profiles.map((profile) => (
								<HouseholdProfileRow
									key={profile.id}
									profile={profile}
									service={service}
									onEdit={
										!profile.archived &&
										data.members.some((person) => person.id === profile.id)
											? (): void =>
													setEditing(
														data.members.find(
															(person) => person.id === profile.id,
														),
													)
											: undefined
									}
								/>
							))}
						</List>
					) : (
						<Text tone="secondary">Loading household…</Text>
					)}
					<HouseholdInvitations service={service} />
					{task.error && !adding ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Surface>
			{editing ? (
				<HouseholdInfoAction
					key={editing.id}
					person={editing}
					onClose={(): void => setEditing(undefined)}
				/>
			) : undefined}
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title="Add a dependent"
				isOpen={adding}
				onOpenChange={(open): void => {
					if (!task.busy) setAdding(open);
				}}
				footer={
					<Row justify="end" wrap>
						<Button
							label="Cancel"
							variant="secondary"
							isDisabled={task.busy}
							onPress={(): void => setAdding(false)}
						/>
						<Button
							label="Create profile"
							isLoading={task.busy}
							onPress={create}
						/>
					</Row>
				}
			>
				<Stack>
					<Text variant="small" tone="secondary">
						Create a profile you manage, without a separate login. To link an
						existing member, ask the club for an invitation.
					</Text>
					<Field
						label="Full name"
						value={name}
						onValueChange={setName}
						isDisabled={task.busy}
						onSubmit={create}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</Stack>
	);
};
