import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Stack, Text, Toggle } from "../design-system";
import { eventAttendees } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";

export const TeamOptions = ({
	eventId,
	plan,
	onClose,
}: {
	eventId: string;
	plan?: TeamPlan;
	onClose: () => void;
}): ReactElement => {
	const { data, dispatch, busy } = useApp();
	const attendees = eventAttendees(data, eventId);
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
				<Toggle
					label="Separate youth"
					value={separateYouth}
					onValueChange={setSeparateYouth}
					isDisabled={busy}
				/>
				<Text variant="label">
					Include players · {attendees.length - excluded.length}
				</Text>
				{attendees.map((member) => (
					<Toggle
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
				{attendees.length - excluded.length < 2 ? (
					<Text variant="small" tone="warning">
						Include at least two players.
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
