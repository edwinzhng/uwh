import { useAction } from "convex/react";
import { type ReactElement, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { ListItem, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export const CalendarSubscriptionChoice = ({
	people,
	onPrepared,
	onBusyChange,
}: {
	people: { id: string }[];
	onPrepared: () => void;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const enable = useAction(api.calendar_tokens.enable);
	const task = useTask();
	useEffect(() => {
		onBusyChange(task.busy);
		return (): void => onBusyChange(false);
	}, [onBusyChange, task.busy]);
	return (
		<Stack gap="xs">
			<ListItem
				title={task.busy ? "Preparing sync…" : "Sync calendar"}
				description="Subscribe for automatic updates."
				icon="calendar"
				onPress={(): void => {
					void task.run(async (): Promise<void> => {
						await Promise.all(
							people.map((person) =>
								enable({ personId: person.id, includeWaitlisted: false }),
							),
						);
						onPrepared();
					});
				}}
			/>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
