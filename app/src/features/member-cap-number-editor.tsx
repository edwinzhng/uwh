import { type ReactElement, useState } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { Button, Dialog, Field, Row, Stack, Text } from "../design-system";
import { memberCapNumberError } from "../domain/member-profile";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

type CapDraft = { personId: string; name: string; revision: number };
export const MemberCapNumberEditor = ({
	state,
}: {
	state: MemberProfileState;
}): ReactElement => {
	const [draft, setDraft] = useState<CapDraft>();
	const [cap, setCap] = useState("");
	const task = useFormTask();
	const key = useOperationKey();
	const profile = state.profile;
	const editable = Boolean(
		profile?.canEditCapNumber &&
			(!draft || profile.personId === draft.personId),
	);
	return (
		<>
			{profile?.canEditCapNumber ? (
				<Button
					label="Edit Cap #"
					accessibilityLabel={`Edit cap number for ${profile.name}`}
					variant="secondary"
					compact
					onPress={(): void => {
						task.clear();
						setCap(
							profile.capNumber === undefined ? "" : String(profile.capNumber),
						);
						setDraft({
							personId: profile.personId,
							name: profile.name,
							revision: profile.revision,
						});
					}}
				/>
			) : undefined}
			{draft ? (
				<Dialog
					title={`Cap number · ${draft.name}`}
					intent="form"
					isOpen
					isDismissDisabled={task.busy}
					onOpenChange={(value): void => {
						if (!value && !task.busy) setDraft(undefined);
					}}
					footer={
						<Row>
							<Button
								label="Cancel"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void => setDraft(undefined)}
							/>
							<Button
								label="Save cap number"
								isDisabled={!editable}
								isLoading={task.busy}
								onPress={(): void => {
									void task.submit(
										() => memberCapNumberError(cap),
										async (): Promise<void> => {
											await state.saveCapNumber({
												personId: draft.personId,
												capNumber: cap,
												revision: draft.revision,
												key: key(
													JSON.stringify({
														personId: draft.personId,
														cap,
														revision: draft.revision,
													}),
												),
											});
											setDraft(undefined);
										},
									);
								}}
							/>
						</Row>
					}
				>
					<Stack>
						<Field
							label="Cap number"
							hint="1–99"
							value={cap}
							inputMode="numeric"
							maxLength={2}
							isDisabled={task.busy || !editable}
							onValueChange={setCap}
						/>
						{task.error ? (
							<Text variant="small" tone="danger">
								{task.error}
							</Text>
						) : undefined}
					</Stack>
				</Dialog>
			) : undefined}
		</>
	);
};
