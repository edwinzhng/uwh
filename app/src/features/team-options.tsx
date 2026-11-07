import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	Button,
	Dialog,
	Divider,
	PersonChoice,
	SegmentedControl,
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
	const [mode, setMode] = useState<"balanced" | "manual">("balanced");
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
					mode === "balanced" && attendees.length - excluded.length < 2
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
							manual: mode === "manual",
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
					label={mode === "manual" ? "Start with empty teams" : "Generate"}
					isLoading={busy}
					isDisabled={
						mode === "balanced" && attendees.length - excluded.length < 2
					}
					onPress={(): void => {
						void generate();
					}}
				/>
			}
		>
			<Stack>
				<SegmentedControl
					label="Starting lineup"
					value={mode}
					options={[
						{ value: "balanced", label: "Balanced teams" },
						{ value: "manual", label: "Start empty" },
					]}
					onValueChange={setMode}
				/>
				{plan ? (
					<Text variant="small" tone="secondary">
						{plan.published
							? "Replaces the current teams and position assignments. Players will no longer see the published lineup until you publish the new teams."
							: "Replaces the current teams and position assignments."}
					</Text>
				) : undefined}
				{mode === "balanced" ? (
					<>
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
					</>
				) : (
					<Text variant="small" tone="secondary">
						Start with empty positions and place attending players yourself.
					</Text>
				)}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
