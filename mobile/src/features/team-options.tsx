import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Divider, Stack, Text, Toggle } from "../design-system";
import { eventAttendees } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";

export const TeamOptions = ({
	eventId,
	partId,
	plan,
	onClose,
}: {
	eventId: string;
	partId?: string;
	plan?: TeamPlan;
	onClose: () => void;
}): ReactElement => {
	const { data, dispatch, busy } = useApp();
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
			await dispatch({
				type: "generate-teams",
				eventId,
				partId,
				separateYouth,
				excludedPersonIds: excluded,
			})
		)
			onClose();
	};
	return (
		<Dialog
			title="Generate teams"
			staffRole="coach"
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
							<Toggle
								compact
								key={member.id}
								label={member.name}
								value={!excluded.includes(member.id)}
								isDisabled={busy}
								onValueChange={(included): void =>
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
				{attendees.length - excluded.length < 2 ? (
					<Text variant="small" tone="warning">
						Include at least two players.
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
