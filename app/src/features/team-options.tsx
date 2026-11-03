import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	Button,
	Dialog,
	Divider,
	PersonChoice,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import { eventAttendees } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import { useFormTask } from "./use-form-task";

export const TeamOptions = ({
	eventId,
	partId,
	plan,
	onGenerated,
	onClose,
}: {
	eventId: string;
	partId?: string;
	plan?: TeamPlan;
	onGenerated?: (revision: number) => void;
	onClose: () => void;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const { busy: appBusy } = useAppStatus();
	const task = useFormTask();
	const busy = appBusy || task.busy;
	const [expectedRevision] = useState(plan?.revision ?? 0);
	const attendees = eventAttendees(data, eventId, partId);
	const [separateYouth, setSeparateYouth] = useState(
		plan?.separateYouth ?? true,
	);
	const [excluded, setExcluded] = useState(
		(plan?.excludedPersonIds ?? []).filter((id) =>
			attendees.some((member) => member.id === id),
		),
	);
	const generate = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined =>
					attendees.length - excluded.length < 2
						? "Include at least two players."
						: undefined,
				async (): Promise<void> => {
					if (
						!(await dispatch({
							type: "generate-teams",
							expectedRevision,
							eventId,
							partId,
							separateYouth,
							excludedPersonIds: excluded,
						}))
					)
						throw new Error(
							"Could not generate teams. Retry, or reopen if another coach changed the lineup.",
						);
				},
			)
		) {
			onGenerated?.(expectedRevision + 1);
			onClose();
		}
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={busy}
			title="Generate teams"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
			footer={
				<Button
					label="Generate"
					isLoading={busy}
					isDisabled={attendees.length - excluded.length < 2}
					onPress={(): void => {
						void generate();
					}}
				/>
			}
		>
			<Stack>
				{plan ? (
					<Text variant="small" tone="secondary">
						Replaces the current teams and position assignments.
					</Text>
				) : undefined}
				<Toggle
					label="Separate youth"
					value={separateYouth}
					onValueChange={setSeparateYouth}
					isDisabled={busy}
				/>
				<Divider />
				<Stack gap="xs">
					<Text variant="caption" tone="secondary">
						Players · {attendees.length - excluded.length}
					</Text>
					<Stack gap="none">
						{attendees.map((member) => (
							<PersonChoice
								key={member.id}
								name={member.name}
								personId={member.id}
								checked={!excluded.includes(member.id)}
								isDisabled={busy}
								onChange={(included): void =>
									setExcluded((current) =>
										included
											? current.filter((id) => id !== member.id)
											: [...current, member.id],
									)
								}
							/>
						))}
					</Stack>
				</Stack>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
